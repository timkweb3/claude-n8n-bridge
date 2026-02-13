/**
 * Build WF11 (Auto-Debugger) and WF12 (Fix Deployer) workflow JSONs
 * Run: node scripts/build-workflows.js
 */
const fs = require('fs');
const path = require('path');

// ============================================================
// WF11 CODE NODE SCRIPTS
// ============================================================

const wf11_buildClaudeRequest = `
const webhook = $('Webhook').item.json;
const workflowJson = $('Fetch Workflow JSON').item.json;
const executionData = $('Fetch Execution Details').item.json;

const workflowStr = JSON.stringify(workflowJson.nodes || workflowJson, null, 2);
const execStr = JSON.stringify(
  executionData.data ? executionData.data.resultData : executionData,
  null, 2
).substring(0, 15000);

const prompt = 'You are an n8n workflow debugger. Analyze this workflow error and propose a fix.\\n\\n' +
  '## Error Details\\n' +
  '- Workflow: ' + webhook.workflow_name + ' (ID: ' + webhook.workflow_id + ')\\n' +
  '- Failed Node: ' + webhook.node_name + '\\n' +
  '- Error: ' + webhook.error_message + '\\n' +
  '- Stack: ' + (webhook.error_stack || 'N/A') + '\\n' +
  '- Severity: ' + webhook.severity + '\\n\\n' +
  '## Workflow JSON\\n\`\`\`json\\n' + workflowStr + '\\n\`\`\`\\n\\n' +
  '## Execution Data\\n\`\`\`json\\n' + execStr + '\\n\`\`\`\\n\\n' +
  '## Instructions\\n' +
  'Respond with ONLY valid JSON (no markdown, no code blocks) in this exact format:\\n' +
  '{\\n' +
  '  "analysis": "Human-readable root cause explanation (2-3 sentences)",\\n' +
  '  "fix_summary": "What changes need to be made",\\n' +
  '  "fix_operations": [\\n' +
  '    {\\n' +
  '      "type": "updateNode",\\n' +
  '      "nodeName": "Node Name Here",\\n' +
  '      "updates": {\\n' +
  '        "parameters": { "only_changed_params": "here" }\\n' +
  '      }\\n' +
  '    }\\n' +
  '  ],\\n' +
  '  "confidence": "high|medium|low",\\n' +
  '  "risk": "Description of what could go wrong"\\n' +
  '}\\n\\n' +
  'Rules:\\n' +
  '- Only include parameters that need to change\\n' +
  '- If no fix possible, return empty fix_operations and explain in analysis\\n' +
  '- Never include credential changes';

const requestBody = {
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }]
};

return [{ json: { requestBody, webhook_data: webhook } }];
`.trim();

const wf11_parseAnalysis = `
const response = $json;
const webhookData = $('Build Claude Request').item.json.webhook_data;

let content = '';
try {
  content = response.content[0].text;
} catch (e) {
  content = JSON.stringify(response);
}

let parsed;
try {
  const jsonMatch = content.match(/\`\`\`json?\\s*([\\s\\S]*?)\\s*\`\`\`/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[1]);
  } else {
    parsed = JSON.parse(content);
  }
} catch (e) {
  parsed = {
    analysis: content.substring(0, 500),
    fix_summary: 'Could not parse structured response from Claude',
    fix_operations: [],
    confidence: 'low',
    risk: 'Response was not in expected JSON format'
  };
}

return [{
  json: {
    timestamp: webhookData.timestamp || new Date().toISOString(),
    workflow_name: webhookData.workflow_name,
    workflow_id: webhookData.workflow_id,
    execution_id: webhookData.execution_id,
    execution_url: webhookData.execution_url || '',
    error_message: webhookData.error_message,
    node_name: webhookData.node_name || '',
    severity: webhookData.severity || 'Unknown',
    analysis: parsed.analysis || '',
    fix_summary: parsed.fix_summary || '',
    fix_operations: parsed.fix_operations || [],
    fix_operations_json: JSON.stringify(parsed.fix_operations || []),
    confidence: parsed.confidence || 'low',
    risk: parsed.risk || ''
  }
}];
`.trim();

const wf11_formatTelegram = `
const data = $('Parse Analysis').item.json;
const executionId = data.execution_id;
const hasFix = data.fix_operations_json !== '[]';

let msg = '<b>Auto-Debugger Analysis</b>\\n\\n';
msg += '<b>Workflow:</b> ' + data.workflow_name + '\\n';
msg += '<b>Failed Node:</b> ' + data.node_name + '\\n';
msg += '<b>Severity:</b> ' + data.severity + '\\n';
msg += '<b>Error:</b> ' + (data.error_message || '').substring(0, 200) + '\\n\\n';
msg += '<b>Analysis:</b>\\n' + data.analysis + '\\n\\n';
msg += '<b>Proposed Fix:</b>\\n' + data.fix_summary + '\\n\\n';
msg += '<b>Confidence:</b> ' + data.confidence + '\\n';
msg += '<b>Risk:</b> ' + data.risk + '\\n';
if (data.execution_url) {
  msg += '\\n<a href="' + data.execution_url + '">View Execution</a>';
}

return [{
  json: {
    message_text: msg,
    execution_id: executionId,
    has_fix: hasFix
  }
}];
`.trim();

// ============================================================
// WF12 CODE NODE SCRIPTS
// ============================================================

const wf12_parseCallback = `
const input = $json;
const callbackQuery = input.callback_query || input;
const queryId = callbackQuery.id || input.callback_query_id || '';
const data = callbackQuery.data || input.data || '';
const chatId = (callbackQuery.message && callbackQuery.message.chat && callbackQuery.message.chat.id) || '';
const messageId = (callbackQuery.message && callbackQuery.message.message_id) || '';

const parts = data.split(':');
const action = parts[0] || '';
const executionId = parts.slice(1).join(':') || '';

return [{
  json: {
    callback_query_id: queryId,
    action: action,
    execution_id: executionId,
    chat_id: String(chatId),
    message_id: String(messageId),
    raw_data: data
  }
}];
`.trim();

const wf12_applyFix = `
const fixData = $('Read Fix from GSheets').item.json;
const currentWorkflow = $('Fetch Current Workflow').item.json;

let fixOps;
try {
  const opsRaw = fixData['Fix Operations'] || fixData.fix_operations_json || '[]';
  fixOps = JSON.parse(opsRaw);
} catch (e) {
  return [{
    json: {
      success: false,
      error: 'Could not parse fix operations: ' + e.message,
      workflow_id: fixData['Workflow ID'] || fixData.workflow_id || ''
    }
  }];
}

if (!fixOps || fixOps.length === 0) {
  return [{
    json: {
      success: false,
      error: 'No fix operations to apply',
      workflow_id: fixData['Workflow ID'] || fixData.workflow_id || ''
    }
  }];
}

// Build credential map from current workflow
const credentialMap = {};
if (currentWorkflow.nodes) {
  for (const node of currentWorkflow.nodes) {
    if (node.credentials) {
      credentialMap[node.name] = JSON.parse(JSON.stringify(node.credentials));
    }
  }
}

// Apply fix operations
const updatedNodes = JSON.parse(JSON.stringify(currentWorkflow.nodes || []));
const changes = [];

for (const op of fixOps) {
  if (op.type === 'updateNode' && op.nodeName) {
    const nodeIdx = updatedNodes.findIndex(n => n.name === op.nodeName);
    if (nodeIdx >= 0 && op.updates) {
      const before = JSON.stringify(updatedNodes[nodeIdx].parameters);
      if (op.updates.parameters) {
        updatedNodes[nodeIdx].parameters = {
          ...updatedNodes[nodeIdx].parameters,
          ...op.updates.parameters
        };
      }
      changes.push('Updated ' + op.nodeName + ': ' + before.substring(0, 100) + ' -> ' + JSON.stringify(updatedNodes[nodeIdx].parameters).substring(0, 100));
    }
  }
}

// Re-inject ALL credentials
for (const node of updatedNodes) {
  if (credentialMap[node.name]) {
    node.credentials = credentialMap[node.name];
  }
}

const mergedWorkflow = { ...currentWorkflow, nodes: updatedNodes };
delete mergedWorkflow.id;
delete mergedWorkflow.createdAt;
delete mergedWorkflow.updatedAt;
delete mergedWorkflow.versionId;

return [{
  json: {
    success: true,
    mergedWorkflow: mergedWorkflow,
    changesDiff: changes.join('\\n'),
    credentialsPreserved: Object.keys(credentialMap).length > 0,
    workflow_id: fixData['Workflow ID'] || fixData.workflow_id || currentWorkflow.id || '',
    workflow_name: fixData['Workflow Name'] || fixData.workflow_name || currentWorkflow.name || '',
    execution_id: fixData['Execution ID'] || fixData.execution_id || '',
    error_message: fixData['Error Message'] || fixData.error_message || '',
    analysis: fixData['Analysis'] || fixData.analysis || '',
    fix_summary: fixData['Fix Summary'] || fixData.fix_summary || ''
  }
}];
`.trim();

// ============================================================
// WF11 AUTO-DEBUGGER
// ============================================================
const wf11 = {
  name: "WF11 Auto-Debugger",
  nodes: [
    // Node 1: Webhook Trigger
    {
      parameters: {
        path: "auto-debugger",
        httpMethod: "POST",
        responseMode: "onReceived",
        options: {}
      },
      id: "b1110001-0001-4000-8000-000000000001",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [250, 300],
      webhookId: "auto-debugger-wf11"
    },

    // Node 2: Fetch Workflow JSON
    {
      parameters: {
        method: "GET",
        url: "=https://n8n.actionforce.us/api/v1/workflows/{{ $json.workflow_id }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        options: {}
      },
      id: "b1110001-0002-4000-8000-000000000002",
      name: "Fetch Workflow JSON",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [500, 300]
    },

    // Node 3: Fetch Execution Details
    {
      parameters: {
        method: "GET",
        url: "=https://n8n.actionforce.us/api/v1/executions/{{ $('Webhook').item.json.execution_id }}?includeData=true",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        options: {}
      },
      id: "b1110001-0003-4000-8000-000000000003",
      name: "Fetch Execution Details",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [750, 300]
    },

    // Node 4: Build Claude Request (Code)
    {
      parameters: {
        jsCode: wf11_buildClaudeRequest
      },
      id: "b1110001-0004-4000-8000-000000000004",
      name: "Build Claude Request",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1000, 300]
    },

    // Node 5: Call Claude API
    {
      parameters: {
        method: "POST",
        url: "https://api.anthropic.com/v1/messages",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "anthropic-version", value: "2023-06-01" },
            { name: "content-type", value: "application/json" }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: {}
      },
      id: "b1110001-0005-4000-8000-000000000005",
      name: "Call Claude API",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1250, 300]
    },

    // Node 6: Parse Analysis (Code)
    {
      parameters: {
        jsCode: wf11_parseAnalysis
      },
      id: "b1110001-0006-4000-8000-000000000006",
      name: "Parse Analysis",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1500, 300]
    },

    // Node 7: Log to Google Sheets
    {
      parameters: {
        operation: "append",
        documentId: {
          __rl: true,
          value: "__SPREADSHEET_ID__",
          mode: "id"
        },
        sheetName: {
          __rl: true,
          value: "WF Error Log",
          mode: "list",
          cachedResultName: "WF Error Log"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            "Timestamp": "={{ $json.timestamp }}",
            "Workflow Name": "={{ $json.workflow_name }}",
            "Workflow ID": "={{ $json.workflow_id }}",
            "Execution ID": "={{ $json.execution_id }}",
            "Error Message": "={{ $json.error_message }}",
            "Severity": "={{ $json.severity }}",
            "Analysis": "={{ $json.analysis }}",
            "Fix Summary": "={{ $json.fix_summary }}",
            "Fix Operations": "={{ $json.fix_operations_json }}",
            "Confidence": "={{ $json.confidence }}",
            "Status": "Pending Approval",
            "Applied At": "",
            "Fix Result": "",
            "GitHub Issue": ""
          },
          matchingColumns: [],
          schema: [
            { id: "Timestamp", displayName: "Timestamp", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Workflow Name", displayName: "Workflow Name", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Workflow ID", displayName: "Workflow ID", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Execution ID", displayName: "Execution ID", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Error Message", displayName: "Error Message", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Severity", displayName: "Severity", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Analysis", displayName: "Analysis", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Fix Summary", displayName: "Fix Summary", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Fix Operations", displayName: "Fix Operations", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Confidence", displayName: "Confidence", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Applied At", displayName: "Applied At", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Fix Result", displayName: "Fix Result", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "GitHub Issue", displayName: "GitHub Issue", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
          ]
        },
        options: {}
      },
      id: "b1110001-0007-4000-8000-000000000007",
      name: "Log to Google Sheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [1750, 300]
    },

    // Node 8: Format Telegram Message (Code)
    {
      parameters: {
        jsCode: wf11_formatTelegram
      },
      id: "b1110001-0008-4000-8000-000000000008",
      name: "Format Telegram Message",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2000, 300]
    },

    // Node 9: Send Telegram with Buttons
    {
      parameters: {
        chatId: "-5108825982",
        text: "={{ $json.message_text }}",
        additionalFields: {
          appendAttribution: false,
          parse_mode: "HTML",
          replyMarkup: "inlineKeyboard",
          inlineKeyboard: {
            rows: [
              {
                row: {
                  values: [
                    {
                      text: "Apply Fix",
                      additionalFields: {
                        callback_data: "={{ 'fix:' + $json.execution_id }}"
                      }
                    },
                    {
                      text: "Skip",
                      additionalFields: {
                        callback_data: "={{ 'skip:' + $json.execution_id }}"
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      },
      id: "b1110001-0009-4000-8000-000000000009",
      name: "Send Telegram with Buttons",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [2250, 300]
    }
  ],

  connections: {
    "Webhook": {
      main: [[{ node: "Fetch Workflow JSON", type: "main", index: 0 }]]
    },
    "Fetch Workflow JSON": {
      main: [[{ node: "Fetch Execution Details", type: "main", index: 0 }]]
    },
    "Fetch Execution Details": {
      main: [[{ node: "Build Claude Request", type: "main", index: 0 }]]
    },
    "Build Claude Request": {
      main: [[{ node: "Call Claude API", type: "main", index: 0 }]]
    },
    "Call Claude API": {
      main: [[{ node: "Parse Analysis", type: "main", index: 0 }]]
    },
    "Parse Analysis": {
      main: [[{ node: "Log to Google Sheets", type: "main", index: 0 }]]
    },
    "Log to Google Sheets": {
      main: [[{ node: "Format Telegram Message", type: "main", index: 0 }]]
    },
    "Format Telegram Message": {
      main: [[{ node: "Send Telegram with Buttons", type: "main", index: 0 }]]
    }
  },

  settings: {
    executionOrder: "v1"
  }
};


// ============================================================
// WF12 FIX DEPLOYER
// ============================================================
const wf12 = {
  name: "WF12 Fix Deployer",
  nodes: [
    // Node 1: Telegram Trigger
    {
      parameters: {
        updates: ["callback_query"]
      },
      id: "b1120001-0001-4000-8000-000000000001",
      name: "Telegram Trigger",
      type: "n8n-nodes-base.telegramTrigger",
      typeVersion: 1.1,
      position: [250, 300],
      webhookId: "wf12-telegram-trigger"
    },

    // Node 2: Parse Callback (Code)
    {
      parameters: {
        jsCode: wf12_parseCallback
      },
      id: "b1120001-0002-4000-8000-000000000002",
      name: "Parse Callback",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [500, 300]
    },

    // Node 3: Answer Callback Query
    {
      parameters: {
        resource: "callback",
        operation: "answerQuery",
        queryId: "={{ $json.callback_query_id }}",
        additionalFields: {}
      },
      id: "b1120001-0003-4000-8000-000000000003",
      name: "Answer Callback Query",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [750, 300]
    },

    // Node 4: Route Decision (IF)
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2
          },
          conditions: [
            {
              id: "f1120001-0001-4000-8000-000000000001",
              leftValue: "={{ $json.action }}",
              rightValue: "fix",
              operator: {
                type: "string",
                operation: "equals",
                name: "filter.operator.equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      id: "b1120001-0004-4000-8000-000000000004",
      name: "Route Decision",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [1000, 300]
    },

    // ===== APPLY BRANCH =====

    // Node 5: Read Fix from GSheets
    {
      parameters: {
        operation: "read",
        documentId: {
          __rl: true,
          value: "__SPREADSHEET_ID__",
          mode: "id"
        },
        sheetName: {
          __rl: true,
          value: "WF Error Log",
          mode: "list",
          cachedResultName: "WF Error Log"
        },
        filtersUI: {
          values: [
            {
              lookupColumn: "Execution ID",
              lookupValue: "={{ $('Parse Callback').item.json.execution_id }}"
            }
          ]
        },
        options: {}
      },
      id: "b1120001-0005-4000-8000-000000000005",
      name: "Read Fix from GSheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [1250, 100]
    },

    // Node 6: Fetch Current Workflow
    {
      parameters: {
        method: "GET",
        url: "=https://n8n.actionforce.us/api/v1/workflows/{{ $json['Workflow ID'] || $json.workflow_id }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        options: {}
      },
      id: "b1120001-0006-4000-8000-000000000006",
      name: "Fetch Current Workflow",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1500, 100]
    },

    // Node 7: Apply Fix (Code)
    {
      parameters: {
        jsCode: wf12_applyFix
      },
      id: "b1120001-0007-4000-8000-000000000007",
      name: "Apply Fix",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1750, 100]
    },

    // Node 8: PUT Updated Workflow
    {
      parameters: {
        method: "PUT",
        url: "=https://n8n.actionforce.us/api/v1/workflows/{{ $json.workflow_id }}",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.mergedWorkflow) }}",
        options: {}
      },
      id: "b1120001-0008-4000-8000-000000000008",
      name: "PUT Updated Workflow",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2000, 100]
    },

    // Node 9: Create GitHub Issue
    {
      parameters: {
        resource: "issue",
        operation: "create",
        owner: "timkweb3",
        repository: "claude-n8n-bridge",
        title: "={{ '[Auto-Fix] ' + $('Apply Fix').item.json.workflow_name + ': ' + ($('Apply Fix').item.json.error_message || '').substring(0, 60) }}",
        body: "={{ '## Auto-Fix Applied\\n\\n' + '**Workflow:** ' + $('Apply Fix').item.json.workflow_name + '\\n' + '**Execution ID:** ' + $('Apply Fix').item.json.execution_id + '\\n\\n' + '### Analysis\\n' + $('Apply Fix').item.json.analysis + '\\n\\n' + '### Fix Applied\\n' + $('Apply Fix').item.json.fix_summary + '\\n\\n' + '### Changes\\n```\\n' + $('Apply Fix').item.json.changesDiff + '\\n```\\n\\n' + '### Credential Preservation\\n' + ($('Apply Fix').item.json.credentialsPreserved ? 'Credentials preserved successfully' : 'No credentials to preserve') }}",
        labels: {
          label: ["auto-fix", "self-healing"]
        },
        additionalFields: {}
      },
      id: "b1120001-0009-4000-8000-000000000009",
      name: "Create GitHub Issue",
      type: "n8n-nodes-base.github",
      typeVersion: 1,
      position: [2250, 100]
    },

    // Node 10: Update GSheets Applied
    {
      parameters: {
        operation: "update",
        documentId: {
          __rl: true,
          value: "__SPREADSHEET_ID__",
          mode: "id"
        },
        sheetName: {
          __rl: true,
          value: "WF Error Log",
          mode: "list",
          cachedResultName: "WF Error Log"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            "Execution ID": "={{ $('Apply Fix').item.json.execution_id }}",
            "Status": "={{ $('Apply Fix').item.json.success ? 'Applied' : 'Failed' }}",
            "Applied At": "={{ $now.toISO() }}",
            "Fix Result": "={{ $('Apply Fix').item.json.success ? 'Success: ' + $('Apply Fix').item.json.changesDiff : 'Failed: ' + ($('Apply Fix').item.json.error || 'Unknown error') }}",
            "GitHub Issue": "={{ $json.html_url || $json.url || '' }}"
          },
          matchingColumns: ["Execution ID"],
          schema: [
            { id: "Execution ID", displayName: "Execution ID", required: false, defaultMatch: true, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Applied At", displayName: "Applied At", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Fix Result", displayName: "Fix Result", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
            { id: "GitHub Issue", displayName: "GitHub Issue", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
          ]
        },
        options: {}
      },
      id: "b1120001-0010-4000-8000-000000000010",
      name: "Update GSheets Applied",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [2500, 100]
    },

    // Node 11: Send Confirmation
    {
      parameters: {
        chatId: "-5108825982",
        text: "={{ $('Apply Fix').item.json.success ? '<b>Fix Applied Successfully</b>\\n\\nWorkflow: ' + $('Apply Fix').item.json.workflow_name + '\\nChanges: ' + $('Apply Fix').item.json.changesDiff + '\\nCredentials preserved: ' + ($('Apply Fix').item.json.credentialsPreserved ? 'Yes' : 'N/A') + '\\n\\nGitHub Issue: ' + ($json['GitHub Issue'] || $json.html_url || 'N/A') : '<b>Fix Failed</b>\\n\\n' + ($('Apply Fix').item.json.error || 'Unknown error') }}",
        additionalFields: {
          parse_mode: "HTML"
        }
      },
      id: "b1120001-0011-4000-8000-000000000011",
      name: "Send Confirmation",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [2750, 100]
    },

    // ===== SKIP BRANCH =====

    // Node 12: Update GSheets Skipped
    {
      parameters: {
        operation: "update",
        documentId: {
          __rl: true,
          value: "__SPREADSHEET_ID__",
          mode: "id"
        },
        sheetName: {
          __rl: true,
          value: "WF Error Log",
          mode: "list",
          cachedResultName: "WF Error Log"
        },
        columns: {
          mappingMode: "defineBelow",
          value: {
            "Execution ID": "={{ $('Parse Callback').item.json.execution_id }}",
            "Status": "Skipped"
          },
          matchingColumns: ["Execution ID"],
          schema: [
            { id: "Execution ID", displayName: "Execution ID", required: false, defaultMatch: true, display: true, type: "string", canBeUsedToMatch: true },
            { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
          ]
        },
        options: {}
      },
      id: "b1120001-0012-4000-8000-000000000012",
      name: "Update GSheets Skipped",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [1250, 500]
    },

    // Node 13: Send Skip Message
    {
      parameters: {
        chatId: "-5108825982",
        text: "={{ 'Fix skipped for execution ' + $('Parse Callback').item.json.execution_id }}",
        additionalFields: {}
      },
      id: "b1120001-0013-4000-8000-000000000013",
      name: "Send Skip Message",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [1500, 500]
    }
  ],

  connections: {
    "Telegram Trigger": {
      main: [[{ node: "Parse Callback", type: "main", index: 0 }]]
    },
    "Parse Callback": {
      main: [[{ node: "Answer Callback Query", type: "main", index: 0 }]]
    },
    "Answer Callback Query": {
      main: [[{ node: "Route Decision", type: "main", index: 0 }]]
    },
    "Route Decision": {
      main: [
        [{ node: "Read Fix from GSheets", type: "main", index: 0 }],
        [{ node: "Update GSheets Skipped", type: "main", index: 0 }]
      ]
    },
    "Read Fix from GSheets": {
      main: [[{ node: "Fetch Current Workflow", type: "main", index: 0 }]]
    },
    "Fetch Current Workflow": {
      main: [[{ node: "Apply Fix", type: "main", index: 0 }]]
    },
    "Apply Fix": {
      main: [[{ node: "PUT Updated Workflow", type: "main", index: 0 }]]
    },
    "PUT Updated Workflow": {
      main: [[{ node: "Create GitHub Issue", type: "main", index: 0 }]]
    },
    "Create GitHub Issue": {
      main: [[{ node: "Update GSheets Applied", type: "main", index: 0 }]]
    },
    "Update GSheets Applied": {
      main: [[{ node: "Send Confirmation", type: "main", index: 0 }]]
    },
    "Update GSheets Skipped": {
      main: [[{ node: "Send Skip Message", type: "main", index: 0 }]]
    }
  },

  settings: {
    executionOrder: "v1"
  }
};


// ============================================================
// WF00 MODIFICATION - Add Trigger Auto-Debugger node
// ============================================================
const wf00_newNode = {
  parameters: {
    method: "POST",
    url: "https://n8n.actionforce.us/webhook/auto-debugger",
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify({ workflow_id: $json.workflow_id, workflow_name: $json.workflow_name, execution_id: $json.execution_id, execution_url: $json.execution_url, error_message: $json.error_message, error_stack: $json.error_stack, node_name: $json.node_name, severity: $json.severity, timestamp: $json.timestamp }) }}",
    options: {
      timeout: 5000
    }
  },
  id: "d0e1f2a3-0010-4000-8000-100000000010",
  name: "Trigger Auto-Debugger",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [1500, 100]
};


// ============================================================
// WRITE FILES
// ============================================================
const outDir = path.join(__dirname, '..', 'workflow-json');

fs.writeFileSync(
  path.join(outDir, 'WF11-auto-debugger.json'),
  JSON.stringify(wf11, null, 2)
);
console.log('Wrote WF11-auto-debugger.json');

fs.writeFileSync(
  path.join(outDir, 'WF12-fix-deployer.json'),
  JSON.stringify(wf12, null, 2)
);
console.log('Wrote WF12-fix-deployer.json');

// Write WF00 modification instructions
const wf00Mod = {
  _instructions: "Add this node to WF00 and connect 'Log to Notion' -> 'Trigger Auto-Debugger' (parallel with existing 'Check If Critical' connection)",
  newNode: wf00_newNode,
  newConnection: {
    from: "Log to Notion",
    to: "Trigger Auto-Debugger",
    _note: "Log to Notion should now connect to BOTH 'Check If Critical' AND 'Trigger Auto-Debugger'"
  }
};

fs.writeFileSync(
  path.join(outDir, 'WF00-modification.json'),
  JSON.stringify(wf00Mod, null, 2)
);
console.log('Wrote WF00-modification.json');

// Write updated WF00 complete JSON
const wf00Raw = fs.readFileSync(path.join(outDir, 'WF00-error-handler.json'), 'utf8');
const wf00 = JSON.parse(wf00Raw);

// Add the new node
wf00.nodes.push(wf00_newNode);

// Update connection: Log to Notion now connects to both Check If Critical AND Trigger Auto-Debugger
wf00.connections["Log to Notion"] = {
  main: [[
    { node: "Check If Critical", type: "main", index: 0 },
    { node: "Trigger Auto-Debugger", type: "main", index: 0 }
  ]]
};

fs.writeFileSync(
  path.join(outDir, 'WF00-error-handler-v2.json'),
  JSON.stringify(wf00, null, 2)
);
console.log('Wrote WF00-error-handler-v2.json');

console.log('\nAll workflow JSONs built successfully!');
console.log('\nNext steps:');
console.log('1. Deploy WF11 and WF12 via n8n REST API');
console.log('2. Update WF00 with the new node');
console.log('3. Set up credentials in n8n editor');
console.log('4. Replace __SPREADSHEET_ID__ with actual Google Sheet ID');
