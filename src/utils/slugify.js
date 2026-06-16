export function slugify(input) {
  return String(input)
    .normalize('NFD') // split accented chars into base + diacritic
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}
