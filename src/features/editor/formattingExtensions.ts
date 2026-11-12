import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import {
  lineSpacingValue,
  sanitizeColor,
  sanitizeFontFamily,
  sanitizeFontSize,
} from './formatting';

export const TextStyle = Mark.create({
  name: 'textStyle',

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) => sanitizeFontFamily(element.style.fontFamily),
        renderHTML: (attributes: Record<string, unknown>) => {
          const family = sanitizeFontFamily(attributes['fontFamily']);
          return family ? { style: `font-family: ${family}` } : {};
        },
      },
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => sanitizeFontSize(element.style.fontSize),
        renderHTML: (attributes: Record<string, unknown>) => {
          const size = sanitizeFontSize(attributes['fontSize']);
          return size ? { style: `font-size: ${size}` } : {};
        },
      },
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => sanitizeColor(element.style.color),
        renderHTML: (attributes: Record<string, unknown>) => {
          const color = sanitizeColor(attributes['color']);
          return color ? { style: `color: ${color}` } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[style]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

export const TextHighlight = Mark.create({
  name: 'highlight',

  addAttributes() {
    return {
      color: {
        default: '#FFFF00',
        parseHTML: (element: HTMLElement) =>
          sanitizeColor(element.style.backgroundColor) ?? '#FFFF00',
        renderHTML: (attributes: Record<string, unknown>) => ({
          style: `background-color: ${sanitizeColor(attributes['color']) ?? '#FFFF00'}`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'mark' }, { tag: 'span[style*="background-color"]', priority: 51 }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },
});

export const ParagraphLineSpacing = Extension.create({
  name: 'paragraphLineSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => lineSpacingValue(element.style.lineHeight),
            renderHTML: (attributes: Record<string, unknown>) => {
              const spacing = lineSpacingValue(attributes['lineSpacing']);
              return spacing ? { style: `line-height: ${spacing}` } : {};
            },
          },
        },
      },
    ];
  },
});
