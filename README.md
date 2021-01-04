# Custom Language Properties

This extension allows you to set your own language properties for the languages you use.  These properties include:

* `comments, brackets, indentationRules, onEnterRules, and wordPattern`   

 --------------

## Features

For example, if you prefer your line comments to look like &nbsp; `// *  ` &nbsp;  you can set it to that in specific languages.  Here is an example setting in user `settings.json`:

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

  These are **NOT** additional comment styles, the default comment styles will be replaced by those in the setting above.  I suggest you do not go crazy with comment style for example, as other editors may not recognize them as comments.  So something like &nbsp; `// **` &nbsp; is fine (the leading &nbsp; `//` will still be recognized as a comment) but &nbsp; `**` &nbsp;  by itself will not by another editor or person without this extension and that setting.  

----------------

## Requirements

Only these language configuration properties can be modified by this extension:

&emsp; &emsp; &emsp; &emsp; &emsp; `comments, brackets, indentationRules, onEnterRules, and wordPattern`

The built-in `vscode.languages.setLanguageConfiguration()` can only use the above settings.  Some other language configuration properties can be set in other ways:

* Autoclosing behavior with the `editor.autoClosingQuotes` and `editor.autoClosingBrackets` settings.
* Autosurrounding behavior with the `editor.autoSurround` setting.  

<br/>  

### The properties used in the settings must be double-escaped.  The default values for those keys are shown where available in the completion suggestion pop-up.  They can be copied from there but then must be double-escaped to work. 

<br/> 

* Tested with settings in the user `settings.json` only as of v0.0.4.

------------------

## Extension Settings

This extension contributes one setting:

* `"custom-language-properties"` - see the example above.

Note that not all properties are available in each language.  For example, `html` doesn't have `lineComment` in its default configuration.

You **must** use vscode's language identifiers within the settings, like `csharp` or `javascriptreact`.

* To remove a custom setting provided by this extension, simply delete it or comment-it-out from the `custom-language-properties` settings and the default setting will be activated again.

Where appropriate, intellisense will suggest available language IDs and language properties (like `comments.lineComment`) relevant to each language.  As of v0.0.4, the work of scrapiing and modifying these language configuration files for each language has just begun - and has only been done for `javascript` and `html` files for demonstration purposes, but I do not anticipate this will be too difficult to automate for all languages prior to downloading and activating this extension.   

Properties already used in the setting for a language are filtered out of the subsequent completion suggestions *if* the `settings.json` file has been saved.  `getConfiguration()` will not get settings that haven't yet been saved.



----------------

## TODO

[ X ] - provide completions for language identifiers   
[ X ] - provide completions for available properties in each language  
[&emsp; ] - work on the non-comment properties, can items be removed or only added?  
[&emsp; ] - scrape all language configuration files and build `langID.json` files for completionProvider properties

## Release Notes

* 0.0.2 - added loading of each new config upon focusing a different file languageId    
* 0.0.3 - name and setting change to `"custom-language-properties"`
* 0.0.4 - added completionProvider for all languageIds and each language's available properties



-----------------------------------------------------------------------------------------------------------  

