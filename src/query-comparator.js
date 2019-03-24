const Sequelize = require('sequelize');

const { Op } = Sequelize;

const dataType = {
  STRING: 'string',
  INTEGER: 'integer',
  BOOL: 'bool',
  DATE: 'date'
};

const equalComparision = (value, type, operation) => {
  let _value = value.split(',');
  if (type === dataType.INTEGER) {
    if (_value.length > 1) {
      _value = _value.map(val => parseInt(val, 10));
      const option = operation === 'and' ? { [Op.and]: _value } : { [Op.or]: _value };
      return option;
    }
    return { [Op.eq]: parseInt(_value[0], 0) };
  }
  if (type === dataType.DATE) {
    if (_value.length > 1) {
      _value = _value.map(val => new Date(parseInt(val, 10)).toISOString());
      const option = operation === 'and' ? { [Op.and]: _value } : { [Op.or]: _value };
      return option;
    }
    return { [Op.eq]: new Date(parseInt(_value[0], 10)).toISOString() };
  }
  if (_value.length > 1) {
    const option = operation === 'and' ? { [Op.and]: _value } : { [Op.or]: _value };
    return option;
  }
  return { [Op.eq]: _value[0] };
};

const notEqualComparision = (value, type) => {
  let _value = value;
  if (type === dataType.INTEGER) {
    _value = parseInt(value, 10);
  } else if (type === dataType.DATE) {
    _value = new Date(parseInt(value, 10)).toISOString();
  }
  return { [Op.ne]: _value };
};

const ltComparision = (value, type) => {
  let _value = value;
  if (type === dataType.INTEGER) {
    _value = parseInt(value, 10);
  } else if (type === dataType.DATE) {
    _value = new Date(parseInt(value, 10)).toISOString();
  }
  return { [Op.lt]: _value };
};

const gtComparision = (value, type) => {
  let _value = value;
  if (type === dataType.INTEGER) {
    _value = parseInt(value, 10);
  } else if (type === dataType.DATE) {
    _value = new Date(parseInt(value, 10)).toISOString();
  }
  return { [Op.gt]: _value };
};

const betweenComparision = (value, type) => {
  let _value = value.split(',');
  if (type === dataType.INTEGER) {
    _value = _value.map(val => parseInt(val, 10));
  } else if (type === dataType.DATE) {
    _value = _value.map(val => new Date(parseInt(val, 10)).toISOString());
  }
  return { [Op.between]: _value };
};

const inComparision = (value, type) => {
  let _value = value.split(',');
  if (type === dataType.INTEGER) {
    _value = _value.map(val => parseInt(val, 10));
  } else if (type === dataType.DATE) {
    _value = _value.map(val => new Date(parseInt(val, 10)).toISOString());
  }
  return { [Op.in]: _value };
};

module.exports = {
  equalComparision,
  notEqualComparision,
  ltComparision,
  gtComparision,
  betweenComparision,
  inComparision,
  dataType
};
