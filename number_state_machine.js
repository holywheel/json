const SIGN = "SIGN";
const DIGIT = "DIGIT";
const RADIXPOINT = "RADIXPOINT";
const TERMINATE = "TERMINATE";
const EXPORNENT = "EXPORNENT";
const INTEGER = "INTEGER";
const INTEGERSIGN = "INTEGERSIGN";
const START = "START";

function nextStateForNumber(state, value) {
  switch(state.current) {
    case START:
      return {
        available: [SIGN, DIGIT]
      };
    case SIGN:
      return {
        available: [DIGIT, INTEGER]
      };
    case DIGIT:
      return {
        available: [DIGIT, RADIXPOINT, EXPORNENT, TERMINATE]
      };
    case RADIXPOINT:
      return {
        available: [DIGIT, TERMINATE]
      };
    case EXPORNENT:
      return {
        available: [INTEGERSIGN, INTEGER]
      };
    case INTEGER:
      return {
        available: [INTEGER, TERMINATE]
      };
    case INTEGERSIGN:
      return {
        available: [INTEGER]
      };
    case TERMINATE:
      return {
        available: [TERMINATE]
      };
    default:
      return {
        available: [TERMINATE]
      };
  }
}

function parseNumber(buf, start, len) {
  const number_0_code = 0x30;
  const number_9_code = 0x39;
  const exponent_e = 0x65;
  const exponent_E = 0x45;
  const radix_point = 0x2e;
  const positive_sign = 0x2b;
  const negative_sign = 0x2d;
  var i = start;
  var state = { current: START };
  var value = { sign: 1, exponent_sign: 1, integer: 0, decimal: 0, expoent: 0 }
  var decimal_counts = 0;
  var currentState;
  var nextState;
  var hasRadixPoint = false;
  for(; i < len; i++) {
    nextState = nextStateForNumber(state);
    // sign
    if (buf[i] === exponent_e || buf[i] === exponent_E) {
      currentState = EXPORNENT;
    } else if (buf[i] === radix_point) {
      currentState = RADIXPOINT;
      hasRadixPoint = true;
    } else if (buf[i] === positive_sign || buf[i] === negative_sign) {
      if (currentState === EXPORNENT) {
        currentState = INTEGERSIGN;
        value.exponent_sign = buf[i] === positive_sign ? 1 : -1;
      } else {
        currentState = SIGN;
        value.sign = buf[i] === positive_sign ? 1 : -1;
      }
    } else if (buf[i] >= number_0_code && buf[i] <= number_9_code) {
      if (currentState === EXPORNENT ||
          currentState === INTEGER ||
          currentState === INTEGERSIGN
      ) {
        currentState = INTEGER;
        value.expoent = value.expoent * 10 +
          value.exponent_sign * (buf[i] - number_0_code);
      } else {
        if (hasRadixPoint) {
          decimal_counts += 1;
          value.decimal = value.decimal * 10 +
            value.sign * (buf[i] - number_0_code);
        } else {
          value.integer = value.integer * 10 +
            value.sign * (buf[i] - number_0_code);
        }
        currentState = DIGIT;
      }
    } else {
      currentState = TERMINATE;
      break;
    }
    if (nextState.available.indexOf(currentState) === -1) {
      throw Error("Number Syntax Error");
    }
    state.current = currentState;
  }
  nextState = nextStateForNumber(state);
  if (nextState.available.indexOf(TERMINATE) === -1) {
    throw Error("Number Syntax Error");
  }
  var ret = (value.integer + value.decimal / Math.pow(10, decimal_counts))
    * Math.pow(10, value.expoent);
  return {
    value: ret,
    next: i
  };
}

module.exports = parseNumber;
