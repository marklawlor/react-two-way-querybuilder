import TreeHelper from './TreeHelper';
import ASTree from './ASTree';

export default class QueryParser {

  static parseToQuery(data, query) {
    query = '(';
    for (let i = 0, length = data.rules.length; i < length; i += 1) {
      if (!data.rules[i].combinator) {
        query += `${data.rules[i].field} ${data.rules[i].operator} '${data.rules[i].value}'`;
        if (i !== length - 1 && !data.rules[i + 1].combinator) {
          query += `${data.combinator} `;
        }
      } else {
        query += ` ${data.combinator} ${this.parseToQuery(data.rules[i], query)}`;
      }
    }
    return `${query})`;
  }

  static parseToData(query, config) {
    if (query === '()') {
      return initData;
    }
    let data = null;
    const tokens = this.getTokensArray(query, config.combinators, config.operators);
    const asTree = ASTree.buildTree(tokens, config.combinators);
    const convertedData = this.convertSyntaxTreeToData(asTree, data, config.combinators, '1', '1');
    console.log('convertData', convertedData);
  }

  static convertSyntaxTreeToData(element, data, combinators, nodeName, combNodeName) {
    data = data ? data : {};
    let newCombName = combNodeName;
    const firstCombinator = this.getFirstCombinator(element, combinators);
    const treeHelper = new TreeHelper(data);
    const newCombinator = {
      combinator: firstCombinator ? firstCombinator.value : combinators[0].combinator,
      nodeName,
      rules: [],
    };
    const currElement = treeHelper.getNodeByName(combNodeName);
    if (element.value === '()' && !element.parent) {
      data = newCombinator;
    } else if (element.value === '()' && element.parent) {
      currElement.rules.push(newCombinator);
      newCombName = nodeName;
    } else if (element.field) {
      const newRule = {
        field: element.field,
        operator: element.operator,
        value: element.value,
        nodeName,
      };
      currElement.rules.push(newRule);
    }
    for (let i = 0; i < element.children.length; i += 1) {
      this.convertSyntaxTreeToData(element.children[i], data, combinators, `${nodeName}/${i}`, newCombName);
    }
  }

  static getTokensArray(query, combinators, operators) {
    const combinatorsIndexes = this.getCombinatorsIndexes(query, combinators);
    const tokens = [];
    let token = '';
    for (let i = 0, length = query.length; i < length; i += 1) {
      const combinatorIndexes = combinatorsIndexes.find(x => x.start === i);
      if (combinatorIndexes) {
        const combinator = query.substring(combinatorIndexes.start, combinatorIndexes.end);
        token = this.pushTokenIfNotEmpty(token, tokens, operators);
        tokens.push(combinator);
        i = combinatorIndexes.end;
      } else if (query[i] === '(' || query[i] === ')') {
        token = this.pushTokenIfNotEmpty(token, tokens, operators);
        tokens.push(query[i]);
      } else {
        token += query[i];
      }
    }
    return tokens;
  }

  static pushTokenIfNotEmpty(token, array, operators) {
    token = token.trim();
    if (token) {
      array.push(this.createTokenObject(token, operators));
    }
    return '';
  }

  static createTokenObject(token, operators) {
    const operatorsPattern = this.getSearchPattern(operators, 'operator');
    const match = operatorsPattern.exec(token);
    const operatorEndIndex = match.index + match.length;
    return {
      field: token.substring(0, match.index),
      operator: token.substring(match.index, match.index + match.length),
      value: token.substring(operatorEndIndex, token.length),
    };
  }

  static getCombinatorsIndexes(query, combinators) {
    const combinatorsIndexes = [];
    const combinatorsPattern = this.getSearchPattern(combinators, 'combinator');
    let match;
    while ((match = combinatorsPattern.exec(query)) !== null) {
      combinatorsIndexes.push({ start: match.index, end: combinatorsPattern.lastIndex });
    }
    return combinatorsIndexes;
  }

  static getSearchPattern(searchValues, name) {
    let pattern = '';
    for (let i = 0; i < searchValues.length; i += 1) {
      pattern += `|${searchValues[i][name]}`;
    }
    // To remove first | character
    pattern = pattern.slice(1);
    return new RegExp(pattern, 'gi');
  }

  static getFirstCombinator(element, combinators) {
    let foundCombinator = element.children.find(x => combinators.find(y => y.combinator === x.value));
    if (!foundCombinator) {
      for (let i = 0; i < element.children.length; i += 1) {
        foundCombinator = this.getFirstCombinator(element.children[i], combinators);
      }
    }
    return foundCombinator;
  }
}
