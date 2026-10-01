import { variableNameRegex } from './regex';

/**
 * Checks whether a value is a variable reference, i.e. it starts with `{`.
 * Leading whitespace is ignored so `"  {{token}}"` is still treated as a reference.
 * Used to skip masking/redaction of secret fields whose value is a variable.
 */
export const startsWithVariableReference = (value) =>
  typeof value === 'string' && value.trimStart().startsWith('{');

/**
 * Returns the list of invalid variable names from a variables array.
 * Skips empty/placeholder names (empty string or whitespace-only).
 */
export const getInvalidVariableNames = (variables) => {
  if (!variables || !Array.isArray(variables)) return [];
  return variables
    .filter((variable) => variable.name && variable.name.trim() !== '' && !variableNameRegex.test(variable.name))
    .map((variable) => variable.name);
};

/**
 * Checks whether any variable in the array has an invalid name.
 * Uses variableNameRegex from regex.js — names may only contain
 * word characters (\\w), hyphens, and dots.
 */
export const hasInvalidVariableNames = (variables) => {
  return getInvalidVariableNames(variables).length > 0;
};

/**
 * The save rejection raised for badly named variables. Callers match on the prefix to decide that a
 * rejection is safe to show verbatim, so build the message here rather than formatting it per site.
 */
export const INVALID_VARIABLE_NAMES_ERROR_PREFIX = 'Invalid variable name(s):';

export const invalidVariableNamesError = (names) => `${INVALID_VARIABLE_NAMES_ERROR_PREFIX} ${names.join(', ')}`;
