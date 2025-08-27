import { Typography, Popover, Space } from '@douyinfe/semi-ui';
import { PlatformBadge } from '../api-badge';
import React from 'react';
import { useLang } from '@rspress/core/runtime';
import './style.css';

const { Paragraph, Title, Text } = Typography;

const UIApiTable = ({ source }: { source: Record<string, unknown>[] }) => {
  const isZh = useLang() === 'zh';

  const renderPropertyItem = (item: any) => {
    const {
      name,
      type,
      summary,
      defaultValue,
      docTypeFallback,
      summary_zh,
      isSupportIOS,
      isSupportAndroid,
      isOption,
    } = item;

    // 处理类型显示
    let normalizedType = type;
    if (typeof type === 'object') {
      normalizedType = type.value;
    }
    if (docTypeFallback && docTypeFallback.content.length > 0) {
      normalizedType = docTypeFallback.content[0].text;
    }

    // 处理描述内容
    const paraCollection =
      isZh && summary_zh && summary_zh.length > 0
        ? summary_zh
        : summary?.map((item: any) => {
            if (item.kind === 'text') {
              return item.text;
            } else if (item.kind === 'code') {
              const text = item.text.replaceAll('`', '');
              return <code key={item.text}>{text}</code>;
            }
            return null;
          });

    // 构建类型字符串
    const typeString = `${name}${isOption ? '?' : ''}: ${normalizedType}`;
    const defaultComment = defaultValue
      ? ` // DefaultValue: ${defaultValue}`
      : '';

    return (
      <div key={name} className="ui-api-property-item">
        {/* 属性名称标题 */}
        <div className="ui-api-property-header">
          <Title heading={3} className="ui-api-property-name">
            <code>{name}</code>
            {/* 平台支持标识 */}
            {(isSupportIOS || isSupportAndroid) && (
              <Space className="ui-api-platform-badges">
                {isSupportIOS && <PlatformBadge platform="ios" />}
                {isSupportAndroid && <PlatformBadge platform="android" />}
              </Space>
            )}
          </Title>
        </div>

        {/* TypeScript 类型定义 */}
        <div className="ui-api-type-definition">
          <pre className="ui-api-code-block">
            <code>
              {defaultComment && (
                <span className="ui-api-comment">{defaultComment}\n</span>
              )}
              {typeString}
            </code>
          </pre>
        </div>

        {/* 属性描述 */}
        {paraCollection && paraCollection.length > 0 && (
          <div className="ui-api-property-description">
            <Paragraph spacing="extended">{paraCollection}</Paragraph>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ui-api-table-list">{source.map(renderPropertyItem)}</div>
  );
};

export { UIApiTable };
