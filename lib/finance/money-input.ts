import type { Language } from "@/lib/i18n/dictionaries";

const MAX_INTEGER_DIGITS = 18;
const MAX_FRACTION_DIGITS = 6;

export function moneyInputSeparators() {
  return { group: ",", decimal: "." };
}

function groupInteger(value: string, separator: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatNormalizedMoneyInput(value: string) {
  if (!value) return "";
  if (value === "-") return "-";
  const { group, decimal } = moneyInputSeparators();
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const hasDecimal = unsigned.includes(".");
  const [integer = "0", fraction = ""] = unsigned.split(".");
  return `${negative ? "-" : ""}${groupInteger(integer || "0", group)}${hasDecimal ? `${decimal}${fraction}` : ""}`;
}

function decimalSeparatorIndex(value: string) {
  const dotIndexes = [...value.matchAll(/\./g)].map((match) => match.index ?? -1);
  const commaIndexes = [...value.matchAll(/,/g)].map((match) => match.index ?? -1);
  if (dotIndexes.length && commaIndexes.length) {
    return Math.max(dotIndexes.at(-1) ?? -1, commaIndexes.at(-1) ?? -1);
  }
  if (dotIndexes.length) return dotIndexes.at(-1) ?? -1;
  if (!commaIndexes.length) return -1;
  if (/^\d{1,3}(?:,\d{3})+$/.test(value)) return -1;
  const index = commaIndexes.at(-1) ?? -1;
  const digitsBefore = value.slice(0, index).replace(/\D/g, "").length;
  const digitsAfter = value.slice(index + 1).replace(/\D/g, "").length;
  return commaIndexes.length === 1 && digitsBefore <= 3 && digitsAfter >= 3 ? -1 : index;
}

function normalizeAtDecimal(value: string, decimalIndex: number, allowNegative: boolean) {
  const negative = allowNegative && value.trim().startsWith("-");
  let integer = value.slice(0, decimalIndex).replace(/\D/g, "").slice(0, MAX_INTEGER_DIGITS).replace(/^0+(?=\d)/, "");
  const fraction = value.slice(decimalIndex + 1).replace(/\D/g, "").slice(0, MAX_FRACTION_DIGITS);
  if (!integer) integer = "0";
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

export function normalizeMoneyInput(value: string, _language: Language, allowNegative = false) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const negative = allowNegative && trimmed.startsWith("-");
  const unsigned = trimmed.replace(/-/g, "");
  const decimalIndex = decimalSeparatorIndex(unsigned);
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

export function normalizeMoneyInputEdit(
  value: string,
  previousDisplay: string,
  previousNormalized: string,
  language: Language,
  allowNegative = false,
) {
  let prefix = 0;
  while (prefix < previousDisplay.length && prefix < value.length && previousDisplay[prefix] === value[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < previousDisplay.length - prefix
    && suffix < value.length - prefix
    && previousDisplay[previousDisplay.length - 1 - suffix] === value[value.length - 1 - suffix]
  ) suffix += 1;
  const inserted = value.slice(prefix, value.length - suffix);
  if (inserted === "," || inserted === ".") return normalizeAtDecimal(value, prefix, allowNegative);

  const previousHadGrouping = previousDisplay.includes(moneyInputSeparators().group);
  const previousHadDecimal = previousNormalized.replace(/^-/, "").includes(".");
  if (previousHadGrouping && !previousHadDecimal && !inserted.includes(",") && !inserted.includes(".") && !value.includes(".")) {
    const negative = allowNegative && value.trim().startsWith("-");
    const integer = value.replace(/\D/g, "").slice(0, MAX_INTEGER_DIGITS).replace(/^0+(?=\d)/, "");
    if (!integer) return negative ? "-" : "";
    return `${negative ? "-" : ""}${integer}`;
  }
  return normalizeMoneyInput(value, language, allowNegative);
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
