# Custom Language Properties

This extension allows you to set your own language properties for the languages you use.  These properties include:

* `comments, brackets, indentationRules, onEnterRules, and wordPattern`   

 (As of v0.0.2 only the comments are being actively worked on.)

 --------------

## Features

For example, if you prefer your line comments to look like &nbsp; `// *  ` &nbsp;  you can set it to that in specific languages.  Here is an example setting:

```jsonc
"custom-language-properties": {
  "javascript": {
    "comments.lineComment": "// *  ",
    "comments.blockComment": ["/***", "***/"]
  },
  "html": {
    "comments.blockComment":["<!--**","**-->"]
  }
}
```

  These are **NOT** additional comment styles, the default comment styles will be replaced by those in the setting above.  I suggest you do not go crazy with comment style for example, as other editors may not recognize them as comments.  So something like &nbsp; `// **` &nbsp; is fine (the leading &nbsp; `//` will still be recognized as a comment) but &nbsp; `**` &nbsp; will not by another editor or person without this extension.  

  ----------------

## Requirements

Only these language configuration properties can be modified by this extension:

`comments, brackets, indentationRules, onEnterRules, and wordPattern`

`vscode.languages.setLanguageConfiguration()` can only use the above settings.  Some other language configuration properties can be set in other ways:

* Users can tweak the autoclosing behavior with the `editor.autoClosingQuotes` and `editor.autoClosingBrackets` settings.
* Users can tweak the autosurrounding behavior with the `editor.autoSurround` setting.  

------------------

## Extension Settings

This extension contributes one setting:

* `"custom-language-properties"` - see the example above.

Note that not all properties are available in each language.  For example, `html` doesn't have `lineComment` in its default configuration.

You **must** use vscode's language identifiers within the settings, like `csharp` or `javascriptreact`.

* To remove a custom setting provided by this extension, simply delete it or comment-it-out from the `custom-language-properties` settings and the default setting will be activated again.  

----------------

## TODO

[ &nbsp; ] - provide completions for language identifiers   
[ &nbsp; ] - provide completions for available properties in each language  
[ &nbsp; ] - work on the non-comment properties, can items be removed  

## Release Notes

* 0.0.2 - added loading of new config upon focusing a different file languageId    
* 0.0.3 - name and setting change to `"custom-language-properties"`



-----------------------------------------------------------------------------------------------------------  

