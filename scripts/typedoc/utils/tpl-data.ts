import * as fs from 'node:fs';

const doFindObjectWithTagValue = (obj, tagName, tagValue) => {
  function recursiveSearch(currentObj) {
    for (let key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        if (key === tagName && currentObj[key] === tagValue) {
          return currentObj;
        }
        if (typeof currentObj[key] === 'object' && currentObj[key] !== null) {
          let result = recursiveSearch(currentObj[key]);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  return recursiveSearch(obj);
};

const doFindObjectWithTag = (obj, tagName) => {
  function recursiveSearch(currentObj) {
    for (let key in currentObj) {
      if (currentObj.hasOwnProperty(key)) {
        if (key === tagName) {
          return currentObj[key];
        }
        if (typeof currentObj[key] === 'object' && currentObj[key] !== null) {
          let result = recursiveSearch(currentObj[key]);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }

  return recursiveSearch(obj);
};

const doSingleTypeCalc = (t) => {
  try {
    const { type, name } = t;
    switch (type) {
      case 'intrinsic':
      case 'reference':
        return name;
      case 'array':
        return `${t.elementType.name}[]`;
      case 'literal':
        return `\'${t.value}\'`;
      case 'templateLiteral':
        return t.head + t.tail?.map((ti) => ti?.[1]).join(',');
      default:
        return t;
    }
  } catch (e) {
    throw e;
  }
};

const doCalcSingleParam = (p) => {
  return `${p.name}: ${doTypeCalc(p.type)}`;
};

const doCalcParams = (params) => {
  return params?.length ? params.map(doCalcSingleParam).join(', ') : '';
};

const doCalcUnionType = (types) => {
  try {
    return types.map(doSingleTypeCalc).join(' | ');
  } catch (e) {
    throw e;
  }
};

const doCalcReflectionType = (declaration) => {
  try {
    if (declaration.signatures) {
      const { parameters, type } = declaration.signatures?.[0];

      return `(${doCalcParams(parameters)}) => ${doSingleTypeCalc(type)}`;
    }

    return 'Record<string, unknown>';
  } catch (e) {
    throw e;
  }
};

const doTypeCalc = (t) => {
  try {
    const { type, name, types, declaration } = t;

    switch (type) {
      case 'intrinsic':
      case 'reference':
        return name;
      case 'array':
        return `${t.elementType.name}[]`;
      case 'templateLiteral':
        return t.head + t.tail?.map((ti) => ti?.[1]).join(',');
      case 'union':
        return doCalcUnionType(types);
      case 'reflection':
        return doCalcReflectionType(declaration);
      default:
        return t;
    }
  } catch (e) {
    return t;
  }
};

const doGetDefaultBaseValueString = (singleContent: string) => {
  const regex = /ts\n(.*?)\n/;
  const match = regex.exec(singleContent);

  if (match) {
    const extractedContent = match[1];

    return extractedContent;
  } else {
    return '';
  }
};

const doGetDefaultComplexValueString = (singleContent: string) => {
  const regex = /`(.*?)`/;
  const match = regex.exec(singleContent);

  if (match) {
    const extractedContent = match[1];

    return extractedContent;
  } else {
    return '';
  }
};

const doDefaultValueCalc = (defaultValue) => {
  if (!defaultValue) return '';

  const { content } = defaultValue;

  return content
    ?.map((c) => {
      const formatValue =
        doGetDefaultBaseValueString(c.text) ||
        doGetDefaultComplexValueString(c.text);

      return formatValue;
    })
    .join(',');
};

const doMoreForItem = (item) => {
  const { name, type } = item;
  // 是否可选
  const isOption = !!doFindObjectWithTagValue(item, 'isOptional', true)
    ? true
    : false;
  // 支持 iOS
  const isSupportIOS = !!doFindObjectWithTagValue(item, 'tag', '@iOS')
    ? true
    : false;
  // 支持 Android
  const isSupportAndroid = !!doFindObjectWithTagValue(item, 'tag', '@Android')
    ? true
    : false;
  // 支持 Harmony
  const isSupportHarmony = !!doFindObjectWithTagValue(item, 'tag', '@Harmony')
    ? true
    : false;
  // 描述信息
  const summary = doFindObjectWithTag(item, 'summary');
  // 默认值
  const defaultValue = doFindObjectWithTagValue(item, 'tag', '@defaultValue');

  const inheritedFrom = item.inheritedFrom?.['name'];
  if (inheritedFrom /** && inheritedFrom.startsWith('StandardProps')**/) {
    return null;
  }

  if (name.startsWith('accessibility')) {
    console.log('name', name, item);
  }
  if (name.startsWith('ios-index-as-z')) {
    console.log('name', name, item);
  }

  return {
    name,
    type: doTypeCalc(type),
    summary,
    defaultValue: doDefaultValueCalc(defaultValue),
    isOption,
    isSupportIOS,
    isSupportAndroid,
    isSupportHarmony,
  };
};

const doGetUIMethod = (method, params, success, fail) => {
  // 获取方法名称（去掉Method后缀）
  const methodName = method?.type?.value || 'unknownMethod';

  // 处理params参数结构
  const paramsStructure = {};
  if (params?.type?.declaration?.children) {
    params.type.declaration.children.forEach((child) => {
      const paramItem = doMoreForItem(child);
      if (paramItem) {
        paramsStructure[paramItem.name] = {
          type: paramItem.type,
          summary: paramItem.summary,
          defaultValue: paramItem.defaultValue,
          isOption: paramItem.isOption,
        };
      }
    });
  }

  // 处理success和fail回调
  const hasSuccess = success && !success.flags?.isInherited;
  const hasFail = fail && !fail.flags?.isInherited;

  // 获取平台支持信息
  const isSupportIOS =
    !!doFindObjectWithTagValue(method, 'tag', '@iOS') ||
    !!doFindObjectWithTagValue(params, 'tag', '@iOS');
  const isSupportAndroid =
    !!doFindObjectWithTagValue(method, 'tag', '@Android') ||
    !!doFindObjectWithTagValue(params, 'tag', '@Android');
  const isSupportHarmony =
    !!doFindObjectWithTagValue(method, 'tag', '@Harmony') ||
    !!doFindObjectWithTagValue(params, 'tag', '@Harmony');

  // 生成方法描述
  let methodDescription = '';
  const methodSummary =
    doFindObjectWithTag(method, 'summary') ||
    doFindObjectWithTag(params, 'summary');
  if (methodSummary && methodSummary.length > 0) {
    methodDescription = methodSummary.map((s: any) => s.text).join(' ');
  } else {
    // 如果没有summary，提供一个默认描述
    switch (methodName) {
      case 'scrollTo':
        methodDescription = '将 <scroll-view> 的内容定位到特定位置。';
        break;
      // 可以为其他常见方法添加默认描述
      default:
        methodDescription = `调用 ${methodName} 方法。`;
    }
  }

  return {
    name: methodName,
    type: 'method', // 标识为方法类型
    summary: methodSummary,
    description: methodDescription,
    params: paramsStructure,
    hasSuccess,
    hasFail,
    isSupportIOS,
    isSupportAndroid,
    isSupportHarmony,
    codeExample: {
      method: methodName,
      params: paramsStructure,
      hasCallbacks: hasSuccess || hasFail,
    },
  };
};

const doGetChildren = (
  groupsRoot: { title: string; children: number[] }[],
  childrenRoot: Record<string, unknown>[],
  flag,
) => {
  return groupsRoot?.map((g) => {
    const { title, children } = g;
    const targetChildren = childrenRoot.filter((c) =>
      children.includes((c as { id: number }).id),
    );

    const formatChildren = targetChildren.map((f) => {
      if (f.groups && f.children) {
        return doGetChildren(
          f.groups as { title: string; children: number[] }[],
          f.children as Record<string, unknown>[],
          flag + '#',
        );
      }

      return doMoreForItem(f);
    });

    // 根据属性名称分类
    const properties = [];
    const events = [];
    const methods = [];

    formatChildren
      .filter((item) => item != null)
      .forEach((item) => {
        if (item.name) {
          if (item.name.startsWith('bind')) {
            // 以 bind 开头的是事件
            events.push(item);
          } else if (item.name.endsWith('Method')) {
            // 以 Method 结尾的是方法
            methods.push(item);
          } else {
            // 其他的是属性
            properties.push(item);
          }
        }
      });

    // 创建分类后的结构
    const categorizedChildren = [];

    if (properties.length > 0) {
      categorizedChildren.push({
        title: '属性',
        flag: ' ',
        children: properties,
      });
    }

    if (events.length > 0) {
      categorizedChildren.push({
        title: '事件',
        flag: ' ',
        children: events,
      });
    }

    if (methods.length > 0) {
      categorizedChildren.push({
        title: '方法',
        flag: ' ',
        children: methods,
      });
    }

    return {
      title,
      flag,
      children:
        categorizedChildren.length > 0
          ? categorizedChildren
          : formatChildren.filter((item) => item != null),
    };
  });
};

const doGenDocData = async (jsonPath: string, savePath: string) => {
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const typedocData = JSON.parse(content);
      const checkIndexTargetGroup = typedocData.groups?.filter(
        (g) => g.title === '接口' || g.title === 'Interfaces',
      )?.[0];

      const rootTitle = checkIndexTargetGroup?.title || '';
      const checkArray = checkIndexTargetGroup?.children || [];

      const rootArray = typedocData.children.filter((c) =>
        checkArray?.includes(c.id),
      );

      rootArray.sort((a, b) => {
        if (a.name.endsWith('Props')) {
          return -1;
        } else if (b.name.endsWith('Props')) {
          return 1;
        } else if (a.name.endsWith('Ref')) {
          return -1;
        } else if (b.name.endsWith('Ref')) {
          return 1;
        } else {
          return 0;
        }
      });

      const rootFlag = '##';

      const docData = {
        title: rootTitle,
        flag: rootFlag,
        children: rootArray?.map((ra) => {
          if (ra.name.endsWith('Method')) {
            const method = ra.children.filter(
              (item) => item.name === 'method',
            )?.[0];
            const params = ra.children.filter(
              (item) => item.name === 'params',
            )?.[0];
            const success = ra.children.filter(
              (item) => item.name === 'success',
            )?.[0];
            const fail = ra.children.filter(
              (item) => item.name === 'fail',
            )?.[0];

            // console.log('method', method);
            // console.log('params', params);
            // console.log('success', success);
            // console.log('fail', fail);
            /**
             * method {
  id: 387,
  name: 'method',
  variant: 'declaration',
  kind: 1024,
  flags: { isExternal: true },
  sources: [ { fileName: 'element/scroll-view.d.ts', line: 260, character: 2 } ],
  type: { type: 'literal', value: 'scrollTo' }
}
params {
  id: 388,
  name: 'params',
  variant: 'declaration',
  kind: 1024,
  flags: { isExternal: true },
  sources: [ { fileName: 'element/scroll-view.d.ts', line: 261, character: 2 } ],
  type: {
    type: 'reflection',
    declaration: {
      id: 389,
      name: '__type',
      variant: 'declaration',
      kind: 65536,
      flags: [Object],
      children: [Array],
      groups: [Array],
      sources: [Array]
    }
  }
}
success {
  id: 393,
  name: 'success',
  variant: 'declaration',
  kind: 1024,
  flags: { isExternal: true, isOptional: true, isInherited: true },
  sources: [ { fileName: 'events.d.ts', line: 298, character: 2 } ],
  type: {
    type: 'reference',
    target: {
      sourceFileName: 'node_modules/@lynx-js/types/types/common/events.d.ts',
      qualifiedName: 'Callback'
    },
    typeArguments: [ [Object] ],
    name: 'Callback',
    package: '@lynx-js/types'
  },
  inheritedFrom: { type: 'reference', target: -1, name: 'BaseMethod.success' }
}
fail {
  id: 394,
  name: 'fail',
  variant: 'declaration',
  kind: 1024,
  flags: { isExternal: true, isOptional: true, isInherited: true },
  sources: [ { fileName: 'events.d.ts', line: 299, character: 2 } ],
  type: {
    type: 'reference',
    target: {
      sourceFileName: 'node_modules/@lynx-js/types/types/common/events.d.ts',
      qualifiedName: 'Callback'
    },
    typeArguments: [ [Object] ],
    name: 'Callback',
    package: '@lynx-js/types'
  },
  inheritedFrom: { type: 'reference', target: -1, name: 'BaseMethod.fail' }
}
             */

            return doGetUIMethod(method, params, success, fail); // gen method mdx;
          }

          console.log('non method', ra.name);

          return {
            title: ra.name,
            flag: rootFlag + '#',
            children: doGetChildren(
              ra.groups as { title: string; children: number[] }[],
              ra.children as Record<string, unknown>[],
              ' ', // 不再增加一个标题
            ),
          };
        }),
      };

      fs.writeFileSync(savePath, JSON.stringify(docData, null, 2));
    } catch (e) {
      return !!0;
    }
  }

  return !!0;
};

export { doGenDocData };
