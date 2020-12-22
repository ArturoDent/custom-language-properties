const vscode = require('vscode');

vscode.languages.setLanguageConfiguration( 
     'javascript', 
     { 
         wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\'\"\,\.\<\>\/\?\s]+)/g, 
  
         indentationRules: { 
             decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/, 
             increaseIndentPattern: /^.*\{[^}"']*$/, 
         }, 
  
         comments: { 
             lineComment: "#", 
             blockComment: ["<#", "#>"], 
         }, 
  
         brackets: [ 
             ["{", "}"], 
             ["[", "]"], 
             ["(", ")"], 
         ], 
  
         onEnterRules: [ 
             { 
                 beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/, 
                 afterText: /^\s*\*\/$/, 
                 action: { indentAction: vscode.IndentAction.IndentOutdent, appendText: " * " }, 
             }, 
             { 
                 beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/, 
                 action: { indentAction: vscode.IndentAction.None, appendText: " * " }, 
             }, 
             { 
                 beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/, 
                 action: { indentAction: vscode.IndentAction.None, appendText: "* " }, 
             }, 
             { 
                 beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/, 
                 action: { indentAction: vscode.IndentAction.None, removeText: 1 }, 
             }, 
             { 
                 beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/, 
                 action: { indentAction: vscode.IndentAction.None, removeText: 1 }, 
             }, 
         ], 
     }); 