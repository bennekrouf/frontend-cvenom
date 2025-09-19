export interface AnalysisSection {
  title: string;
  content: string;
  score?: string; // "good", "fair", "poor", etc.
  points?: string[];
}

export interface DisplayFormat {
  type: 'key_value' | 'analysis' | 'table' | 'status';
  sections?: AnalysisSection[];
  headers?: string[];
  rows?: string[][];
  current?: string;
  total?: string;
  percentage?: number;
}

export type StandardApiResponse =
  | {
    type: 'text';
    success: true;
    message: string;
    conversation_id?: string;
  }
  | {
    type: 'file';
    success: true;
    message: string;
    file_type: string;
    filename: string;
    download_url?: string;
    conversation_id?: string;
  }
  | {
    type: 'data';
    success: true;
    message: string;
    data: Record<string, unknown>;
    display_format?: DisplayFormat;
    conversation_id?: string;
  }
  | {
    type: 'action';
    success: true;
    message: string;
    action: string;
    next_actions?: string[];
    conversation_id?: string;
  }
  | {
    type: 'error';
    success: false;
    error: string;
    error_code?: string;
    suggestions?: string[];
    conversation_id?: string;
  };

// Helper function to format API responses in chat
export function formatChatResponse(response: StandardApiResponse): {
  content: string;
  type: 'text' | 'file' | 'data' | 'action' | 'error';
  additionalData?: Record<string, unknown>;
} {
  switch (response.type) {
    case 'text':
      return {
        content: `✅ ${response.message}`,
        type: 'text'
      };

    case 'file':
      return {
        content: `✅ ${response.message}`,
        type: 'file',
        additionalData: {
          filename: response.filename,
          file_type: response.file_type,
          download_url: response.download_url
        }
      };

    case 'data':
      let content = `✅ ${response.message}`;

      // Format data display based on display_format
      if (response.display_format?.type === 'analysis' && response.display_format.sections) {
        content += '\n\n' + formatAnalysisDisplay(response.display_format.sections);
      } else if (response.display_format?.type === 'table' && response.display_format.headers && response.display_format.rows) {
        content += '\n\n' + formatTableDisplay(response.display_format.headers, response.display_format.rows);
      }

      return {
        content,
        type: 'data',
        additionalData: response.data
      };

    case 'action':
      let actionContent = `✅ ${response.message}`;

      if (response.next_actions && response.next_actions.length > 0) {
        actionContent += '\n\nNext steps:\n' + response.next_actions.map(action => `• ${action}`).join('\n');
      }

      return {
        content: actionContent,
        type: 'action',
        additionalData: { action: response.action }
      };

    case 'error':
      let errorContent = `❌ ${response.error}`;

      if (response.suggestions && response.suggestions.length > 0) {
        errorContent += '\n\nSuggestions:\n' + response.suggestions.map(suggestion => `• ${suggestion}`).join('\n');
      }

      return {
        content: errorContent,
        type: 'error'
      };

    default:
      return {
        content: '❓ Unknown response format',
        type: 'error'
      };
  }
}

function formatAnalysisDisplay(sections: AnalysisSection[]): string {
  return sections.map(section => {
    let sectionText = `**${section.title}**`;

    if (section.score) {
      const scoreEmoji = getScoreEmoji(section.score);
      sectionText += ` ${scoreEmoji}`;
    }

    sectionText += `\n${section.content}`;

    if (section.points && section.points.length > 0) {
      sectionText += '\n' + section.points.map(point => `• ${point}`).join('\n');
    }

    return sectionText;
  }).join('\n\n');
}

function formatTableDisplay(headers: string[], rows: string[][]): string {
  // Simple text table format
  let table = headers.join(' | ') + '\n';
  table += headers.map(() => '---').join(' | ') + '\n';
  table += rows.map(row => row.join(' | ')).join('\n');
  return table;
}

function getScoreEmoji(score: string): string {
  switch (score.toLowerCase()) {
    case 'good':
    case 'excellent':
      return '🟢';
    case 'fair':
    case 'moderate':
      return '🟡';
    case 'poor':
    case 'low':
      return '🔴';
    default:
      return '⚪';
  }
}
