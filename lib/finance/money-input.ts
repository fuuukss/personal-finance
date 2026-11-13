import type { Language } from "@/lib/i18n/dictionaries";

const MAX_INTEGER_DIGITS = 18;
const MAX_FRACTION_DIGITS = 6;

export function moneyInputSeparators(language: Language) {
  return language === "sr-Latn"
    ? { group: ".", decimal: "," }
    : { group: ",", decimal: "." };
}

function groupInteger(value: string, separator: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatNormalizedMoneyInput(value: string, language: Language) {
  if (!value) return "";
  if (value === "-") return "-";
  const { group, decimal } = moneyInputSeparators(language);
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const hasDecimal = unsigned.includes(".");
  const [integer = "0", fraction = ""] = unsigned.split(".");
  return `${negative ? "-" : ""}${groupInteger(integer || "0", group)}${hasDecimal ? `${decimal}${fraction}` : ""}`;
}

function decimalSeparatorIndex(value: string, language: Language) {
  const dotIndexes = [...value.matchAll(/\./g)].map((match) => match.index ?? -1);
  const commaIndexes = [...value.matchAll(/,/g)].map((match) => match.index ?? -1);
  if (dotIndexes.length && commaIndexes.length) {
    return Math.max(dotIndexes.at(-1) ?? -1, commaIndexes.at(-1) ?? -1);
  }
  const indexes = dotIndexes.length ? dotIndexes : commaIndexes;
  if (indexes.length !== 1) return -1;
  const index = indexes[0] ?? -1;
  const separator = value[index];
  const { decimal } = moneyInputSeparators(language);
  if (separator === decimal) return index;
  const digitsAfter = value.slice(index + 1).replace(/\D/g, "").length;
  return digitsAfter === 3 ? -1 : index;
}

export function normalizeMoneyInput(value: string, language: Language, allowNegative = false) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const negative = allowNegative && trimmed.startsWith("-");
  const unsigned = trimmed.replace(/-/g, "");
  const decimalIndex = decimalSeparatorIndex(unsigned, language);
  let integer = "";
  let fraction = "";
  for (let index = 0; index < unsigned.length; index += 1) {
    const character = unsigned[index];
    if (!character || !/\d/.test(character)) continue;
    if (decimalIndex >= 0 && index > decimalIndex) fraction += character;
    else integer += character;
  }
  integer = integer.slice(0, MAX_INTEGER_DIGITS).replace(/^0+(?=\d)/, "");
  fraction = fraction.slice(0, MAX_FRACTION_DIGITS);
  if (!integer && decimalIndex < 0) return negative ? "-" : "";
  if (!integer) integer = "0";
  return `${negative ? "-" : ""}${integer}${decimalIndex >= 0 ? `.${fraction}` : ""}`;
}

export function canonicalMoneyInputValue(value: string | number | undefined, language: Language, allowNegative = false) {
  if (value === undefined || value === "") return "";
  const text = String(value).trim();
  if (/^-?\d+(?:\.\d*)?$/.test(text)) {
    const negative = allowNegative && text.startsWith("-");
    const unsigned = text.replace(/^-/, "");
    const [integer = "0", fraction] = unsigned.split(".");
    const normalizedInteger = integer.slice(0, MAX_INTEGER_DIGITS).replace(/^0+(?=\d)/, "") || "0";
    return `${negative ? "-" : ""}${normalizedInteger}${fraction === undefined ? "" : `.${fraction.slice(0, MAX_FRACTION_DIGITS)}`}`;
  }
  return normalizeMoneyInput(text, language, allowNegative);
}

export function moneyInputSubmissionValue(value: string) {
  if (!value || value === "-") return "";
  return value.endsWith(".") ? value.slice(0, -1) : value;
}
