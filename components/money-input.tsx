"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent } from "react";
import type { Language } from "@/lib/i18n/dictionaries";
import {
  canonicalMoneyInputValue,
  formatNormalizedMoneyInput,
  moneyInputSeparators,
  moneyInputSubmissionValue,
  normalizeMoneyInput,
} from "@/lib/finance/money-input";

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name" | "onChange" | "type" | "value"> {
  name: string;
  language: Language;
  defaultValue?: string | number;
  value?: string;
  allowNegative?: boolean;
  onValueChange?: (value: string) => void;
}

export function MoneyInput({
  name,
  language,
  defaultValue,
  value,
  allowNegative = false,
  onValueChange,
  className = "input",
  disabled,
  ...inputProps
}: MoneyInputProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => canonicalMoneyInputValue(defaultValue, language, allowNegative));
  const normalized = controlled ? canonicalMoneyInputValue(value, language, allowNegative) : internalValue;
  const displayValue = formatNormalizedMoneyInput(normalized, language);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | "end" | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    const position = pendingCaret.current === "end"
      ? inputRef.current.value.length
      : caretForSemanticPosition(inputRef.current.value, pendingCaret.current, language);
    inputRef.current.setSelectionRange(position, position);
    pendingCaret.current = null;
  }, [displayValue, language]);

  function commit(nextDisplay: string, caret: number, wasAtEnd = false) {
    const semanticPosition = semanticPositionAt(nextDisplay, caret, language);
    const nextValue = normalizeMoneyInput(nextDisplay, language, allowNegative);
    pendingCaret.current = wasAtEnd ? "end" : semanticPosition;
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) return;
    const position = event.currentTarget.selectionStart ?? 0;
    const { group } = moneyInputSeparators(language);
    if (event.key === "Backspace" && position > 1 && displayValue[position - 1] === group) {
      event.preventDefault();
      const deleteAt = position - 2;
      commit(`${displayValue.slice(0, deleteAt)}${displayValue.slice(deleteAt + 1)}`, deleteAt);
    } else if (event.key === "Delete" && displayValue[position] === group && position + 1 < displayValue.length) {
      event.preventDefault();
      commit(`${displayValue.slice(0, position + 1)}${displayValue.slice(position + 2)}`, position);
    }
  }

  return <>
    <input
      {...inputProps}
      ref={inputRef}
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      value={displayValue}
      onKeyDown={handleKeyDown}
      onChange={(event) => {
        const caret = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
        commit(event.currentTarget.value, caret, caret === event.currentTarget.value.length);
      }}
    />
    <input type="hidden" name={name} disabled={disabled} value={moneyInputSubmissionValue(normalized)} />
  </>;
}

function semanticPositionAt(value: string, caret: number, language: Language) {
  const { decimal } = moneyInputSeparators(language);
  return [...value.slice(0, caret)].filter((character) => /\d/.test(character) || character === decimal || character === "-").length;
}

function caretForSemanticPosition(value: string, semanticPosition: number, language: Language) {
  if (semanticPosition <= 0) return 0;
  const { decimal } = moneyInputSeparators(language);
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character && (/\d/.test(character) || character === decimal || character === "-")) seen += 1;
    if (seen >= semanticPosition) return index + 1;
  }
  return value.length;
}
