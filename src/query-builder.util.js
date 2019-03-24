const Sequelize = require('sequelize');
const {
  equalComparision,
  notEqualComparision,
  ltComparision,
  gtComparision,
  betweenComparision,
  inComparision,
  dataType
} = require('./query-comparator');

const { Op } = Sequelize;

const extractGroupCombinedQuery = (group) => {
  const query = {};
  Object.keys(group).forEach((key) => {
    query[key] = group[key].combineGroupQuery;
  });
  return query;
};

const arrayToObjectMapper = (array) => {
  const obj = {};
  array.forEach((value) => {
    Object.getOwnPropertySymbols(value).forEach((_value) => {
      obj[_value] = value[_value];
    });
  });
  return obj;
};

const combineGroupQuery = (group) => {
  const _group = group;
  Object.keys(_group).forEach((key) => {
    _group[key].addGroupQuery = arrayToObjectMapper(_group[key].addQuery);
    _group[key].orGroupQuery = arrayToObjectMapper(_group[key].orQuery);
    if (Object.getOwnPropertySymbols(_group[key].addGroupQuery).length > 0 && Object.getOwnPropertySymbols(_group[key].orGroupQuery).length > 0) {
      let andQuery;
      let orQuery;
      if (Object.getOwnPropertySymbols(_group[key].addGroupQuery).length > 1) {
        andQuery = { [Op.and]: _group[key].addGroupQuery };
      } else {
        andQuery = _group[key].addGroupQuery;
      }
      if (Object.getOwnPropertySymbols(_group[key].orGroupQuery).length > 1) {
        orQuery = { [Op.or]: _group[key].orGroupQuery };
      } else {
        orQuery = _group[key].orGroupQuery;
      }
      _group[key].combineGroupQuery = { [Op.and]: { ...andQuery, ...orQuery } };
    } else if (Object.getOwnPropertySymbols(_group[key].addGroupQuery).length > 0) {
      let andQuery;
      if (Object.getOwnPropertySymbols(_group[key].addGroupQuery).length > 1) {
        andQuery = { [Op.and]: _group[key].addGroupQuery };
      } else {
        andQuery = _group[key].addGroupQuery;
      }
      _group[key].combineGroupQuery = andQuery;
    } else {
      let orQuery;
      if (Object.getOwnPropertySymbols(_group[key].orGroupQuery).length > 1) {
        orQuery = { [Op.or]: _group[key].orGroupQuery };
      } else {
        orQuery = _group[key].orGroupQuery;
      }
      _group[key].combineGroupQuery = orQuery;
    }
  });
  return _group;
};

const possibleFilterFunctions = {
  '=': equalComparision, '!': notEqualComparision, '>': gtComparision, '<': ltComparision, '-': betweenComparision, _: inComparision
};

const curateIndividualQuery = (query, dataType, operation) => {
  if (possibleFilterFunctions[query.charAt(0)]) {
    return possibleFilterFunctions[query.charAt(0)](query.substring(1), dataType, operation);
  }
  return possibleFilterFunctions['='](query, dataType, operation);
};

const validateQueryKey = (filterableColumns, key, groupName) => {
  if (!filterableColumns[key]) {
    throw new Error('INVALID_QUERY');
  }
};

const curateGroupQuery = (filterableColumns, groups) => {
  Object.keys(groups).forEach((key) => {
    const dataType = filterableColumns[key];
    const groupAddQueries = [];
    groups[key].add.forEach((individual) => {
      groupAddQueries.push(curateIndividualQuery(individual, dataType, 'and'));
    });
    const groupOrQueries = [];
    groups[key].or.forEach((individual) => {
      groupOrQueries.push(curateIndividualQuery(individual, dataType, 'or'));
    });
    groups[key].addQuery = groupAddQueries; // eslint-disable-line
    groups[key].orQuery = groupOrQueries; // eslint-disable-line
  });
  return groups;
};

const groupQueriesByName = (filter, queries, groupName) => {
  const group = {};
  queries.forEach((query) => {
    const addOperation = [];
    const orOperation = [];
    let operation = 'and';
    let actualQuery = query;
    if (query.charAt(0) === '-') {
      actualQuery = query.substring(1);
      operation = 'or';
    }
    const splitQuery = actualQuery.split(':');
    if (operation === 'and') {
      addOperation.push(splitQuery[1]);
    } else {
      orOperation.push(splitQuery[1]);
    }
    let _key = splitQuery[0];
    validateQueryKey(filter, _key, groupName);
    if (filter[_key] && typeof filter[_key] === 'object' && filter[_key].mapping) {
      const { type } = filter[_key];
      _key = filter[_key].mapping;
      filter[_key] = type; // eslint-disable-line
    }
    if (!group[_key]) {
      group[_key] = {
        add: [],
        or: []
      };
    }
    group[_key].add.push(...addOperation);
    group[_key].or.push(...orOperation);
  });
  return group;
};

const groupNestedQuery = (queries) => {
  const nested = {};
  const individual = [];
  queries.forEach((query) => {
    const _query = query.split('.');
    if (_query.length > 1) {
      nested[_query[0]] = nested[_query[0]] ? `${nested[_query[0]]}|${_query[1]}` : _query[1];
    } else {
      individual.push(query);
    }
  });
  return { nested, individual };
};

const queryBuilder = (filterableColumns, query, groupName = 'default') => {
  if (!query) {
    return {};
  }
  const individualQueries = query.split('|');
  const { nested, individual } = groupNestedQuery(individualQueries);
  const individualFilter = {};
  Object.keys(filterableColumns).forEach((key) => {
    if (typeof filterableColumns[key] === 'string') {
      individualFilter[key] = filterableColumns[key];
    } else if (filterableColumns[key].type) {
      individualFilter[key] = filterableColumns[key];
    }
  });
  let groupQueries = groupQueriesByName(individualFilter, individual, groupName);
  groupQueries = curateGroupQuery(individualFilter, groupQueries);
  groupQueries = combineGroupQuery(groupQueries);
  const customQuery = extractGroupCombinedQuery(groupQueries);
  const _nested = {};
  Object.keys(nested).forEach((key) => {
    _nested[key] = queryBuilder(filterableColumns[key], nested[key], key);
  });
  return { ...customQuery, ..._nested };
};

const sortBuilder = (allowedKey, sort, defaultSort) => {
  const _sort = sort || defaultSort;
  if (!_sort) {
    return [];
  }
  const sortValues = _sort.split(':');
  if (!allowedKey[sortValues[0]]) {
    throw new Error('INVALID_SORT');
  }
  let orderType = 'ASC';
  if (sortValues[1] && sortValues[1].toLowerCase() === 'desc') {
    orderType = 'DESC';
  }
  return [[allowedKey[sortValues[0]], orderType]];
};

module.exports = {
  queryBuilder,
  sortBuilder,
  dataType
};
