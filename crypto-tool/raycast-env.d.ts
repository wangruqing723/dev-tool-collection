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
  /** Preferences accessible in the `hash` command */
  export type Hash = ExtensionPreferences & {}
  /** Preferences accessible in the `bcrypt` command */
  export type Bcrypt = ExtensionPreferences & {}
  /** Preferences accessible in the `jwt` command */
  export type Jwt = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `hash` command */
  export type Hash = {}
  /** Arguments passed to the `bcrypt` command */
  export type Bcrypt = {}
  /** Arguments passed to the `jwt` command */
  export type Jwt = {}
}

