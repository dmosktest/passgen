import type { Locale } from "./i18n";
import { localeNames } from "./site-config";

export type CharSets = {
  digits: boolean;
  lower: boolean;
  upper: boolean;
  specials: boolean;
};

export type PresetValues = {
  length: number;
  sets: CharSets;
  noDup: boolean;
  exclude: string;
  similar: boolean;
  specialsAllowlist: string | null;
};

export type Preset = {
  id: string;
  values: PresetValues;
  name: Record<Locale, string>;
  hint: Record<Locale, string>;
};

export const PRESETS: Preset[] = [
  {
    id: "default",
    name: localeNames({
      en: "Universal",
      ru: "Универсальный",
      zh: "通用",
      es: "Universal",
      de: "Universal",
      fr: "Universel",
      ja: "汎用",
      ko: "범용",
      ar: "عام",
      tr: "Evrensel",
      pt: "Universal",
      it: "Universale",
      hi: "सार्वत्रिक",
      vi: "Phổ thông",
      tlh: "Hoch",
    }),
    hint: localeNames({
      en: "Email, socials, shops — full character set",
      ru: "Почта, соцсети, магазины — полный набор символов",
      zh: "邮箱、社交、购物 — 完整字符集",
      es: "Correo, redes, tiendas — juego completo",
      de: "E-Mail, soziale Netze, Shops — voller Zeichensatz",
      fr: "E-mail, réseaux, boutiques — jeu complet",
      ja: "メール・SNS・買い物 — フル文字セット",
      tlh: "QumwI', QonoS — Seghmey Hoch",
    }),
    values: {
      length: 12,
      sets: { digits: true, lower: true, upper: true, specials: true },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: null,
    },
  },
  {
    id: "wifi",
    name: localeNames({ en: "Wi-Fi", ru: "Wi-Fi", zh: "Wi-Fi", tlh: "Wi-Fi" }),
    hint: localeNames({
      en: "No symbols — easier to type on a TV or phone",
      ru: "Без спецсимволов, чтобы вводить на ТВ и телефоне",
      zh: "无符号，便于在电视或手机上输入",
      es: "Sin símbolos — más fácil en TV o móvil",
      de: "Ohne Sonderzeichen — leichter auf TV oder Handy",
      fr: "Sans symboles — plus simple sur TV ou téléphone",
      ja: "記号なし — TVやスマホで入力しやすい",
      tlh: "le' Hutlh — jan 'ej HjIj laDlaH",
    }),
    values: {
      length: 20,
      sets: { digits: true, lower: true, upper: true, specials: false },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: null,
    },
  },
  {
    id: "shell",
    name: localeNames({
      en: "Server & shell",
      ru: "Сервер и shell",
      zh: "服务器与 shell",
      es: "Servidor y shell",
      de: "Server & Shell",
      fr: "Serveur et shell",
      ja: "サーバーとシェル",
      tlh: "yaS shell",
    }),
    hint: localeNames({
      en: "Safe to paste into shells, .env files, and configs",
      ru: "Безопасно вставлять в консоль, .env и конфиги",
      zh: "可安全粘贴到 shell、.env 和配置",
      es: "Seguro para pegar en shells, .env y configs",
      de: "Sicher für Shells, .env und Configs",
      fr: "Sûr pour shells, .env et configs",
      ja: "シェル・.env・設定に貼り付けやすい",
      tlh: "console, .env, chut — Qap",
    }),
    values: {
      length: 24,
      sets: { digits: true, lower: true, upper: true, specials: true },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: "-_.,+=@",
    },
  },
  {
    id: "url",
    name: localeNames({
      en: "Database & URL",
      ru: "База и URL",
      zh: "数据库与 URL",
      es: "Base de datos y URL",
      de: "Datenbank & URL",
      fr: "Base et URL",
      ja: "DB と URL",
      tlh: "De' URL",
    }),
    hint: localeNames({
      en: "Characters safe in connection strings and URLs",
      ru: "Символы, безопасные в строках подключения и URL",
      zh: "适合连接串和 URL 的字符",
      es: "Caracteres seguros en cadenas de conexión y URL",
      de: "Sicher in Connection-Strings und URLs",
      fr: "Sûrs dans les chaînes de connexion et URL",
      ja: "接続文字列や URL で安全な文字",
      tlh: "URL 'ej De' mu'tlheghmeyDaq Qap",
    }),
    values: {
      length: 24,
      sets: { digits: true, lower: true, upper: true, specials: true },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: "-._~",
    },
  },
  {
    id: "pin",
    name: localeNames({
      en: "PIN code",
      ru: "PIN-код",
      zh: "PIN 码",
      es: "Código PIN",
      de: "PIN-Code",
      fr: "Code PIN",
      ja: "PINコード",
      tlh: "PIN",
    }),
    hint: localeNames({
      en: "Digits only — ATM, lock, phone",
      ru: "Только цифры — банкомат, замок, телефон",
      zh: "仅数字 — 取款机、锁、手机",
      es: "Solo dígitos — cajero, cerradura, teléfono",
      de: "Nur Ziffern — Geldautomat, Schloss, Telefon",
      fr: "Chiffres seulement — distributeur, serrure, téléphone",
      ja: "数字のみ — ATM・錠・電話",
      tlh: "mI' neH — lojmIt, HjIj",
    }),
    values: {
      length: 6,
      sets: { digits: true, lower: false, upper: false, specials: false },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: null,
    },
  },
  {
    id: "voice",
    name: localeNames({
      en: "For dictation",
      ru: "Для диктовки",
      zh: "口述用",
      es: "Para dictado",
      de: "Zum Diktieren",
      fr: "Pour la dictée",
      ja: "読み上げ用",
      tlh: "jatlh",
    }),
    hint: localeNames({
      en: "Lowercase and digits without look-alike confusion",
      ru: "Строчные и цифры без путаницы при диктовке",
      zh: "小写和数字，避免易混字符",
      es: "Minúsculas y dígitos sin confusión visual",
      de: "Kleinbuchstaben und Ziffern ohne Verwechslungen",
      fr: "Minuscules et chiffres sans confusion",
      ja: "紛らわしくない小文字と数字",
      tlh: "mach 'ej mI' — jatlhlaH",
    }),
    values: {
      length: 16,
      sets: { digits: true, lower: true, upper: false, specials: false },
      noDup: false,
      exclude: "0o1il",
      similar: true,
      specialsAllowlist: null,
    },
  },
  {
    id: "token",
    name: localeNames({
      en: "API token",
      ru: "API-токен",
      zh: "API 令牌",
      es: "Token API",
      de: "API-Token",
      fr: "Jeton API",
      ja: "APIトークン",
      tlh: "API ngIv",
    }),
    hint: localeNames({
      en: "32 characters, no symbols — API keys and Bearer tokens",
      ru: "32 символа без спецзнаков — ключи API и Bearer-токены",
      zh: "32 个字符、无符号 — API 密钥与 Bearer",
      es: "32 caracteres sin símbolos — claves API y Bearer",
      de: "32 Zeichen ohne Sonderzeichen — API-Keys und Bearer",
      fr: "32 caractères sans symboles — clés API et Bearer",
      ja: "32文字・記号なし — APIキーとBearer",
      tlh: "32 Segh, le' Hutlh — API",
    }),
    values: {
      length: 32,
      sets: { digits: true, lower: true, upper: true, specials: false },
      noDup: false,
      exclude: "",
      similar: true,
      specialsAllowlist: null,
    },
  },
];

export const DEFAULT_PRESET_ID = "default";

export function getPreset(id: string | null | undefined): Preset | undefined {
  if (!id) return undefined;
  return PRESETS.find((p) => p.id === id);
}

export function defaultPreset(): Preset {
  return getPreset(DEFAULT_PRESET_ID)!;
}
