/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `base64` command */
  export type Base64 = ExtensionPreferences & {}
  /** Preferences accessible in the `hexadecimal` command */
  export type Hexadecimal = ExtensionPreferences & {}
  /** Preferences accessible in the `unicode-form` command */
  export type UnicodeForm = ExtensionPreferences & {}
  /** Preferences accessible in the `time-convert` command */
  export type TimeConvert = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `base64` command */
  export type Base64 = {
  /** 留空则用剪贴板 */
  "text": string,
  /** 默认自动检测 */
  "operation": "auto" | "encode" | "decode"
}
  /** Arguments passed to the `hexadecimal` command */
  export type Hexadecimal = {
  /** 留空则用剪贴板 */
  "text": string
}
  /** Arguments passed to the `unicode-form` command */
  export type UnicodeForm = {}
  /** Arguments passed to the `time-convert` command */
  export type TimeConvert = {}
}

