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
  /** Preferences accessible in the `uuid` command */
  export type Uuid = ExtensionPreferences & {}
  /** Preferences accessible in the `qrcode` command */
  export type Qrcode = ExtensionPreferences & {}
  /** Preferences accessible in the `variable-name` command */
  export type VariableName = ExtensionPreferences & {}
  /** Preferences accessible in the `random-string` command */
  export type RandomString = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `uuid` command */
  export type Uuid = {
  /** 选择生成类型 */
  "type": "uuid" | "guid",
  /** 默认保留连字符 */
  "dash": "false" | "true",
  /** 默认小写 */
  "upper": "false" | "true"
}
  /** Arguments passed to the `qrcode` command */
  export type Qrcode = {}
  /** Arguments passed to the `variable-name` command */
  export type VariableName = {}
  /** Arguments passed to the `random-string` command */
  export type RandomString = {
  /** 长度（默认16） */
  "length": string,
  /** 字符集 */
  "charset": "alphanumeric" | "lowercase" | "uppercase" | "numbers" | "symbols"
}
}

