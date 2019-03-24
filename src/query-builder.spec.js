/* eslint-disable arrow-body-style */
const Sequelize = require('sequelize');
const util = require('./query-builder.util');

const { Op } = Sequelize;

const { dataType } = util;

describe('Utility - queryBuilder', () => {
  const filterableColumns = {
    code: dataType.STRING,
    kenticoId: dataType.INTEGER,
    id: dataType.INTEGER,
    tag: dataType.STRING,
    siteId: dataType.STRING,
    rank: dataType.STRING,
    age: dataType.INTEGER,
    createdAt: dataType.DATE
  };
  beforeEach(() => {});

  afterEach(() => {});

  // it('run fake test, to touch all parts', () => {
  //   const query = 'id:10|id:!5|id:>1|-id:-15,20|-id:<100|-tag:rahul,khanna,hello|tag:!kamal|-siteId:1,2|rank:<1000|rank:>10|-age:>5|-age:<20';
  //   // const query = 'category.kenticoId:>3|category.kenticoId:!5|code:rahul';
  //   try {
  //     const result = util.queryBuilder(filterableColumns, query);
  //     console.log(result);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // });

  it('should test nested OR query', () => {
    const query = 'category.-kenticoId:>3|category.-kenticoId:5|code:rahul';
    const options = {
      category: { kenticoId: { type: dataType.INTEGER, mapping: 'cmsId' } }, code: dataType.STRING
    };
    const result = util.queryBuilder(options, query);
    expect(result).toEqual(
      expect.objectContaining({
        category: {
          cmsId: {
            [Op.or]: {
              [Op.gt]: 3,
              [Op.eq]: 5
            }
          }
        },
        code: { [Op.eq]: 'rahul' }
      })
    );
  });

  it('should test nested AND query', () => {
    const query = 'category.-kenticoId:>3|category.kenticoId:5|code:rahul';
    const options = {
      category: { kenticoId: { type: dataType.INTEGER, mapping: 'cmsId' } }, code: dataType.STRING
    };
    const result = util.queryBuilder(options, query);
    expect(result).toEqual(
      expect.objectContaining({
        category: {
          cmsId: {
            [Op.and]: {
              [Op.gt]: 3,
              [Op.eq]: 5
            }
          }
        },
        code: { [Op.eq]: 'rahul' }
      })
    );
  });

  it('should test nested group query', () => {
    const query = 'category.kenticoId:>3|category.kenticoId:<50|category.-kenticoId:5|category.-kenticoId:!13|code:rahul';
    const options = {
      category: { kenticoId: { type: dataType.INTEGER, mapping: 'cmsId' } }, code: dataType.STRING
    };
    const result = util.queryBuilder(options, query);
    expect(result).toEqual(
      expect.objectContaining({
        category: {
          cmsId: {
            [Op.and]: {
              [Op.and]: {
                [Op.gt]: 3,
                [Op.lt]: 50
              },
              [Op.or]: {
                [Op.eq]: 5,
                [Op.ne]: 13
              }
            }
          }
        },
        code: { [Op.eq]: 'rahul' }
      })
    );
  });

  it('should test nested query', () => {
    const query = 'category.kenticoId:>3|category.kenticoId:!5|code:rahul';
    const options = {
      category: { kenticoId: { type: dataType.INTEGER, mapping: 'cmsId' } }, code: dataType.STRING
    };
    const result = util.queryBuilder(options, query);
    expect(result).toEqual(
      expect.objectContaining({
        category: {
          cmsId: {
            [Op.and]: {
              [Op.gt]: 3,
              [Op.ne]: 5
            }
          }
        },
        code: { [Op.eq]: 'rahul' }
      })
    );
  });

  it('should fail if the query option is not allowed', () => {
    try {
      const query = 'id:10|siteId:1';
      util.queryBuilder({ id: dataType.INTEGER }, query);
    } catch (err) {
      expect(err.message).toBe('INVALID_QUERY');
    }
  });

  it('should create a query for getting all the records belong to siteId equals to 2', () => {
    const query = 'siteId:2';
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        siteId: { [Op.eq]: '2' }
      })
    );
  });

  it('should create query for getting records where id is between 1 and 10 and createdAt between today date and tomorrow', () => {
    const today = new Date().getTime();
    const tomorrow = today + (60 * 60 * 24 * 1000);
    const query = `id:-1,10|createdAt:-${today},${tomorrow}|siteId:-1,3`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.between]: [1, 10] },
        createdAt: { [Op.between]: [new Date(today).toISOString(), new Date(tomorrow).toISOString()] },
        siteId: { [Op.between]: ['1', '3'] }
      })
    );
  });

  it('should create query for getting records where id is either 1 or 10 using IN and createdAt either today or tomorrow', () => {
    const today = new Date().getTime();
    const tomorrow = today + (60 * 60 * 24 * 1000);
    const query = `id:_1,10|createdAt:_${today},${tomorrow}|siteId:_1,3`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.in]: [1, 10] },
        createdAt: { [Op.in]: [new Date(today).toISOString(), new Date(tomorrow).toISOString()] },
        siteId: { [Op.in]: ['1', '3'] }
      })
    );
  });

  it('should create query for getting records where id greater than 1, siteId greater than 1 and createdAt is also greater than today date', () => {
    const today = new Date().getTime();
    const query = `id:>1|createdAt:>${today}|siteId:>1`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.gt]: 1 },
        createdAt: { [Op.gt]: new Date(today).toISOString() },
        siteId: { [Op.gt]: '1' }
      })
    );
  });

  it('should create query for getting records where id lower than 1, siteId lower than 1 and createdAt is also lower than today date', () => {
    const today = new Date().getTime();
    const query = `id:<1|createdAt:<${today}|siteId:<1`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.lt]: 1 },
        createdAt: { [Op.lt]: new Date(today).toISOString() },
        siteId: { [Op.lt]: '1' }
      })
    );
  });

  it('should create query where id is not 1, site id is not 2 and createdAt is not todays date', () => {
    const today = new Date().getTime();
    const query = `id:!1|createdAt:!${today}|siteId:!1`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.ne]: 1 },
        createdAt: { [Op.ne]: new Date(today).toISOString() },
        siteId: { [Op.ne]: '1' }
      })
    );
  });

  it('should create query where id is 1, site id is 2 and createdAt is today date', () => {
    const today = new Date().getTime();
    const query = `id:1|createdAt:${today}|siteId:1`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.eq]: 1 },
        createdAt: { [Op.eq]: new Date(today).toISOString() },
        siteId: { [Op.eq]: '1' }
      })
    );
  });

  it('should create query where id is 1 and 2, site id is 2 and 3 and createdAt is today date and tomorrow', () => {
    const today = new Date().getTime();
    const tomorrow = today + (60 * 60 * 24 * 1000);
    const query = `id:1,2|createdAt:${today},${tomorrow}|siteId:2,3`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.and]: [1, 2] },
        createdAt: { [Op.and]: [new Date(today).toISOString(), new Date(tomorrow).toISOString()] },
        siteId: { [Op.and]: ['2', '3'] }
      })
    );
  });

  it('should create query where id is 1 or 2, site id is 2 or 3 and createdAt is today date or tomorrow', () => {
    const today = new Date().getTime();
    const tomorrow = today + (60 * 60 * 24 * 1000);
    const query = `-id:1,2|-createdAt:${today},${tomorrow}|-siteId:2,3`;
    const result = util.queryBuilder(filterableColumns, query);
    expect(result).toEqual(
      expect.objectContaining({
        id: { [Op.or]: [1, 2] },
        createdAt: { [Op.or]: [new Date(today).toISOString(), new Date(tomorrow).toISOString()] },
        siteId: { [Op.or]: ['2', '3'] }
      })
    );
  });

  it('should return the empty objec', () => {
    const query = '';
    const result = util.queryBuilder({ title: dataType.STRING }, query);
    expect(result).toBeEmpty();
  });

  it('should throw error if invalid sort key is used', () => {
    try {
      const sort = 'title:asc';
      util.sortBuilder({}, sort);
    } catch (err) {
      expect(err.message).toBe('INVALID_SORT');
    }
  });

  it('should return the valid sort in ascending order if order type not specified', () => {
    const sort = 'title';
    const result = util.sortBuilder({ title: 'title' }, sort);
    expect(result).toEqual([['title', 'ASC']]);
  });

  it('should return the valid sort in ascending order', () => {
    const sort = 'title:asc';
    const result = util.sortBuilder({ title: 'title' }, sort);
    expect(result).toEqual([['title', 'ASC']]);
  });

  it('should return the valid sort in descending order', () => {
    const sort = 'title:desc';
    const result = util.sortBuilder({ title: 'title' }, sort);
    expect(result).toEqual([['title', 'DESC']]);
  });

  it('should return the empty array', () => {
    const sort = '';
    const result = util.sortBuilder({ title: 'title' }, sort);
    expect(result).toBeEmpty();
  });
});
