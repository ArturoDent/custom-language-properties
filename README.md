# Custom Language Properties

This extension allows you to set your own language properties for the languages you use.  These properties include:

* comments and  brackets 

Not available yet: work continues on `indentationRules`, `onEnterRules`, and `wordPattern`.

 --------------

## Features

For example, if you prefer your line comments to look like &nbsp; `// *  ` &nbsp;  you can set it to that in specific languages.  Here is an example setting in user `settings.json`:

```jsonc
"custom-language-properties": {
  "javascript.comments.lineComment": "// *",
  "python.comments.lineComment": "# *",
  "python.brackets": [["{","}"],["[","]"],["(",")"]]
}
```

  These are **NOT** additional comment styles, the default comment styles will be replaced by those in your setting.  I suggest you do not go crazy with comment style for example, as other editors may not recognize them as comments.  So something like &nbsp; `// **` &nbsp; is fine (the leading &nbsp; `//` will still be recognized as a comment) but &nbsp; `**` &nbsp;  by itself will not by another editor or person without this extension and that setting.

  The `brackets` setting will replace the entire default language `brackets` configuration.  So you probably don't want to do that but add another `brackets` option to the end of the default setting.  Above is the python default `brackets` setting, to add to it use the same syntax plus your addition, like so:

```jsonc
"python.brackets": [["{","}"],["[","]"],["(",")"],["<",">"]]
```  
----------------  

## Requirements

Only these language configuration properties can be modified by this extension at this time: &emsp; `comments` and `brackets`

[Because `indentationRules`, `onEnterRules`, and `wordPattern` use regexp values, I am continuing to work on adding those.]

The built-in `vscode.languages.setLanguageConfiguration()` can only use the above settings.  Some other language configuration properties can be set in other ways:

* Autoclosing behavior with the `editor.autoClosingQuotes` and `editor.autoClosingBrackets` settings.
* Autosurrounding behavior with the `editor.autoSurround` setting.  

<br/>  

The *default* values are shown where available in the completion suggestion pop-up.  Intellisense will complete the default values - you can add or modify those values.  You do not need to include the default values, they will automatically be added for you.

<br/> 

* Tested with settings in the user `settings.json` only as of v0.5.0.

------------------

## Extension Settings

This extension contributes one setting:

* `"custom-language-properties"` - see the example above.

<br/>

Note that not all properties are available in each language.  For example, `html` doesn't have `lineComment` in its default configuration.  So intellisense will not show a `lineComment` option for `html`.

<br/>

You **must** use vscode's language identifiers within the setting, like `csharp` or `javascriptreact`.

<br/>

* To remove a custom setting provided by this extension, simply delete it or comment-it-out from the `custom-language-properties` settings, save the modified settings file and the default setting will be activated again.  

<br/>

Where appropriate, intellisense will suggest available language IDs and language properties (like `comments.lineComment`) relevant to each language. 

If you have added a language configuration extension **after the first time this extension is activated**, you will need to re-run the initialization step that finsd all language configuration extensions in your workspace and builds the necessary files in the extension's storage to enable intellisense in the settings.  

* Run the command `custom-language-syntax.rebuildConfigFiles` to find each installed language configuration extension and build the necessary files.  The required files will be automatically saved in the correct location.

If at any time you just want to see the language configuration file for the current editor's language, you can

*  Run the command `custom-language-syntax.showConfigFile` to see the current editor's language configuration file and then  

<br/>

Properties, like `comments.lineComment`  already used in the setting for a language are filtered out of the subsequent completion suggestions *if* the `settings.json` file has been saved.  `getConfiguration()` will not get settings that haven't yet been saved.    

<br/>

### This extension **must** have its own copy of the language configuration file for each languageID that you wish to use in the setting.   If you are not getting intellisense in the `"custom-language-properties"` setting for a language's configuration propoerties, like `comments.lineComment` or `brackets` with their default values, run the `custom-language-syntax.rebuildConfigFiles`  mentioned above.  
  
<br/>

> Note: There is a general setting `Editor > Comments: Insert Space` which, if enabled, will automatically add a space after your comment characters.  The default option for this setting is `disabled`.  Just be aware that if you have that setting enabled a space will be added after whatever comment character(s) you set in this extension's settings.  

----------------

## TODO

[ X ] - Provide completions for language identifiers.   
[ X ] - Provide completions for available properties in each language.    
[ X ] - Scrape all default language configuration files and build `<langID>.json` files for completionProvider properties.  
[ X ] - Fix resetting to defaults when settings removed.  
[ X ] - Investigate getting settings (for the filters) of a dirty settings.json file, not returned by `getConfiguration()`.      
[ X ] - Make language file acquisition and reduction automatic for new languages on start-up.   
[&emsp; ] - Investigate how to get `indentationRules`, `onEnterRules`, and `wordPattern` regex values working.   
[&emsp; ] - Fix intellisense for partial completions in settings.  
[ X ] - Investigate global storage for config and intellisense files.  
 

<br/>

## Release Notes

0.0.2 - Added loading of each new config upon focusing a different file languageId.    
0.0.3 - Name and setting change to `"custom-language-properties"`.  
0.0.4 - Added completionProvider for all languageIds and each language's available properties.  
0.1.0 - Fixed the completionProvider to not delete omitted properties.   
&emsp;&emsp;&emsp;Scraped and reduced all language configuration files in the default vscode setup.    
0.1.5 - Added filters for comments/brackets and for already used properties in the setting.    
0.2.0 - `getLanguageConfigFiles()` changed to handle arrays of contributed languages.  
0.3.0 - Added get input from user for unknown languages.  
0.4.0 - Added lisp (https://marketplace.visualstudio.com/items?itemName=mattn.Lisp) to supported languages.    
0.5.0 - Simplified configuration file creation.   
&emsp;&emsp;&emsp;Using `jsonc-parser` for configuration files.  
&emsp;&emsp;&emsp;New command: `custom-language-syntax.rebuildConfigFiles`.  
&emsp;&emsp;&emsp;0.5.2 - Better intellisense.  Refactor getting settings and setting configurations.   



-----------------------------------------------------------------------------------------------------------    