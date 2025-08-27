import * as fs from 'node:fs';

/**
 * 生成平台支持标识
 */
const generatePlatformBadges = (item: any): string => {
  const platforms = [];
  if (item.isSupportIOS) platforms.push('iOS');
  if (item.isSupportAndroid) platforms.push('Android');
  if (item.isSupportHarmony) platforms.push('Harmony');

  if (platforms.length === 0) return '';

  return platforms
    .map((platform) => `<Badge type="info">${platform}</Badge>`)
    .join(' ');
};

/**
 * 生成属性的 Markdown 内容
 */
const generatePropertyMarkdown = (item: any): string => {
  const { name, type, summary, defaultValue, isOption } = item;

  // 生成属性标题
  const optionalMark = isOption ? '?' : '';
  const propertyTitle = `### \`${name}\``;

  // 生成类型定义代码块
  const typeDefinition = `\`\`\`ts\n// DefaultValue: ${defaultValue || 'none'}\n${name}${optionalMark}: ${type}\n\`\`\``;

  // 生成描述
  const description =
    summary && summary.length > 0 ? summary.map((s) => s.text).join(' ') : '';

  // 生成平台支持
  const platformBadges = generatePlatformBadges(item);

  // 组合内容
  const parts = [
    propertyTitle,
    typeDefinition,
    description,
    platformBadges,
  ].filter(Boolean);

  return parts.join('\n\n');
};

/**
 * 生成事件的 Markdown 内容
 */
const generateEventMarkdown = (item: any): string => {
  const { name, type, summary } = item;

  // 移除 bind 前缀，获取事件名称
  const eventName = name.replace(/^bind/, '');

  // 生成事件标题
  const eventTitle = `### \`${eventName}\``;

  // 生成类型定义代码块
  const typeDefinition = `\`\`\`ts\n${name} = (e: ${eventName}Event) => {};\n\ninterface ${eventName}Event extends CustomEvent {\n  detail: {\n    // 事件详细信息\n  };\n}\n\`\`\``;

  // 生成描述
  const description =
    summary && summary.length > 0 ? summary.map((s) => s.text).join(' ') : '';

  // 生成平台支持
  const platformBadges = generatePlatformBadges(item);

  // 组合内容
  const parts = [
    eventTitle,
    typeDefinition,
    description,
    platformBadges,
  ].filter(Boolean);

  return parts.join('\n\n');
};

/**
 * 生成方法的 Markdown 内容
 */
const generateMethodMarkdown = (item: any): string => {
  const { name, description, params, hasSuccess, hasFail } = item;
  console.log(item);
  // 生成方法标题
  const methodTitle = `### \`${name}\``;

  // 生成参数代码块
  let paramsBlock = '{}';
  if (params && Object.keys(params).length > 0) {
    const paramLines = Object.entries(params).map(
      ([key, param]: [string, any]) => {
        const commentParts = [];
        if (param.summary && param.summary.length > 0) {
          commentParts.push(param.summary.map((s: any) => s.text).join(' '));
        }
        if (param.defaultValue) {
          commentParts.push(`默认值: ${param.defaultValue}`);
        }
        const comment =
          commentParts.length > 0 ? ` // ${commentParts.join('; ')}` : '';

        return `      ${key}: ${param.type},${comment}`;
      },
    );
    paramsBlock = `{\n${paramLines.join('\n')}\n    }`;
  }

  // 生成回调函数代码块
  let callbacksBlock = '';
  if (hasSuccess || hasFail) {
    const callbacks = [];
    if (hasSuccess) {
      callbacks.push('    success(res) {\n      console.log(res);\n    },');
    }
    if (hasFail) {
      callbacks.push(
        '    fail(res) {\n      console.log(res.code, res.data);\n    },',
      );
    }
    callbacksBlock = `,\n${callbacks.join('\n')}`;
  }

  // 生成类型定义代码块
  const typeDefinition = `\`\`\`ts
lynx.createSelectorQuery()
  .select('#elementId')
  .invoke({
    method: '${name}',
    params: ${paramsBlock}${callbacksBlock}
  })
  .exec();
\`\`\``;

  // 生成平台支持
  const platformBadges = generatePlatformBadges(item);

  // 组合内容
  const parts = [
    methodTitle,
    typeDefinition,
    description,
    platformBadges,
  ].filter(Boolean);

  return parts.join('\n\n');
};

/**
 * 根据内容类型生成对应的 Markdown
 */
const generateSectionMarkdown = (title: string, items: any[]): string => {
  if (!items || items.length === 0) return '';

  const sectionTitle = `## ${title}`;

  let contentGenerator;

  // 根据标题判断内容类型
  if (title.includes('属性') || title.includes('Properties')) {
    contentGenerator = generatePropertyMarkdown;
  } else if (title.includes('事件') || title.includes('Events')) {
    contentGenerator = generateEventMarkdown;
  } else if (title.includes('方法') || title.includes('Methods')) {
    contentGenerator = generateMethodMarkdown;
  } else {
    // 默认使用属性格式
    contentGenerator = generatePropertyMarkdown;
  }

  const itemsMarkdown = items.map(contentGenerator).join('\n\n');

  const introText =
    title.includes('方法') || title.includes('Methods')
      ? '前端可以通过 [SelectorQuery](/api/lynx-api/nodes-ref/nodes-ref-invoke.html) API 执行组件的方法。'
      : `前端可以在组件上绑定相应${title}来监听组件的运行时行为。`;

  return `${sectionTitle}\n\n${introText}\n\n${itemsMarkdown}`;
};

/**
 * 递归生成 Markdown 内容
 */
const doGenMdx = (data: any[]): string => {
  if (!data || data.length === 0) return '';

  return data
    .map((d) => {
      if (d.flag && d.title) {
        // 如果有子项且子项是属性数组，直接生成属性列表
        if (d.children && Array.isArray(d.children) && d.children.length > 0) {
          // 检查是否是属性数组（有 name, type 等字段）
          if (
            d.children[0] &&
            typeof d.children[0] === 'object' &&
            'name' in d.children[0]
          ) {
            return generateSectionMarkdown(d.title, d.children);
          } else {
            // 递归处理嵌套结构
            return `${d.flag} ${d.title}\n\n${doGenMdx(d.children)}`;
          }
        } else {
          return `${d.flag} ${d.title}`;
        }
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
};

const doGenTplWithData = async (dataPath: string, savePath: string) => {
  const dataString = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(dataString);

  // 生成导入语句（如果需要 Badge 组件）
  const imports = `import { Badge } from '@lynx'\n\n`;

  // 生成主标题
  const mainTitle = `${data.flag} ${data.title}`;

  // 分离方法和其他子元素
  const methods = data.children.filter((child: any) => child.type === 'method');
  const otherChildren = data.children.filter(
    (child: any) => child.type !== 'method',
  );

  // 为非方法子元素生成内容
  const otherContent = doGenMdx(otherChildren);

  // 为方法生成内容
  const methodContent =
    methods.length > 0 ? generateSectionMarkdown('方法', methods) : '';

  // 组合内容
  const content = [otherContent, methodContent].filter(Boolean).join('\n\n');

  // 组合最终内容
  const finalContent = `${imports}${mainTitle}\n\n${content}\n`;

  fs.writeFileSync(savePath, finalContent);
};

export { doGenTplWithData };
