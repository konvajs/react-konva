export const MIN_EXPECTED_REACT_VERSION = '16.8.0';

/**
 * checks if major version is 16 and minor is greater than 8
 * or, if major version is >=17.0.0
 * @see https://bit.ly/2TXrtbT for regex source
 **/
const EXPECTED_REACT_VERSION_REGEX =
  /^(((16)\.([8-9]+[0-4]*|([1-7]+[0-9]+)))|((17|18)\.([0-9]+)))\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const validateReactVersion = (currentVersion) => {
  return currentVersion.match(EXPECTED_REACT_VERSION_REGEX);
};
