/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as matches from "../matches.js";
import type * as permissions from "../permissions.js";
import type * as players from "../players.js";
import type * as registrations from "../registrations.js";
import type * as seed from "../seed.js";
import type * as standings from "../standings.js";
import type * as stats from "../stats.js";
import type * as teamConfigurations from "../teamConfigurations.js";
import type * as testing from "../testing.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  matches: typeof matches;
  permissions: typeof permissions;
  players: typeof players;
  registrations: typeof registrations;
  seed: typeof seed;
  standings: typeof standings;
  stats: typeof stats;
  teamConfigurations: typeof teamConfigurations;
  testing: typeof testing;
  tournaments: typeof tournaments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
