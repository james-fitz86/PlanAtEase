export function countryNameFromCode(code, locale = "en") {
  if (!code) return "-";
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    const name = dn.of(String(code).toUpperCase());
    return name || code.toUpperCase();
  } catch {
    return String(code).toUpperCase();
  }
}