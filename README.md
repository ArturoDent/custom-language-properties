# Custom Language Properties

This extension allows you to set your own language properties for the languages you use.  These properties include:

* `comments, brackets` 

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

[Because `indentationRules`, `onEnterRules`, and `wordPattern` use regexp values, I am continuing to work on adding those.  These three plus `comments` and `brackets` are all that will ever be settable.]

The built-in `vscode.languages.setLanguageConfiguration()` can only use the above settings.  Some other language configuration properties can be set in other ways:

* Autoclosing behavior with the `editor.autoClosingQuotes` and `editor.autoClosingBrackets` settings.
* Autosurrounding behavior with the `editor.autoSurround` setting.  

<br/>  

### The *default* values are shown where available in the completion suggestion pop-up.  Intellisense will complete the default values - you can add or modify those values.  You do not need to include the default values, they will automatically be added for you.

<br/> 

* Tested with settings in the user `settings.json` only as of v0.1.5.

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

Where appropriate, intellisense will suggest available language IDs and language properties (like `comments.lineComment`) relevant to each language.  As of v0.1.5, the work of scraping and modifying these language configuration files for each language has begun - see the list [here](./langIDs.md) of files that can be used in this extension's setting.   

If you have added a language configuration other than those on the list mentioned above, you can run the command `custom-language-syntax.showConfigFile` to see the current editor's language configuration file and then `custom-language-syntax.transformConfigFile` to convert it for use with this setting.

<br/>

Properties already used in the setting for a language are filtered out of the subsequent completion suggestions *if* the `settings.json` file has been saved.  `getConfiguration()` will not get settings that haven't yet been saved.    

<br/>

This extension contributes two commands:  

* `custom-language-syntax.showConfigFile`: ***"Show the language configuration file for the current editor"***  

Show the default language contribution file, if available, for the languageID of the current text editor.  

<br />

* `custom-language-syntax.transformConfigFile`: ***"Transform the current language configuration file for intellisense"***

With a language configuration file as the currentTextEditor (see previous command), transform and save it into this extension's source files.  Those properties, like `folding markers` which cannot be set via `vscode.languages.setLanguageConfiguration()` will be removed and the other properties transformed into a form like `comments.lineComment` that will be used for intellisense in the `"custom-language-properties"` setting.  

### This extension **must** have its own copy of the language configuration file for each languageID that you wish to use in the setting. 
  
  <br/>

----------------

## TODO

[ X ] - provide completions for language identifiers   
[ X ] - provide completions for available properties in each language    
[ X ] - scrape all language configuration files and build `langID.json` files for completionProvider properties  
[ X ] - fix resetting to default languages previously set  
[ X ] - investigate getting settings (for the filters) of dirty settings.json file, not returned by `getConfiguration()`      
[&emsp; ] - make language file acquisition and reduction on-demand for new languages  
[&emsp; ] - investigate why `indentationRules`, `onEnterRules`, and `wordPattern` properties are not working  

<br/>

## Release Notes

0.0.2 - added loading of each new config upon focusing a different file languageId    
0.0.3 - name and setting change to `"custom-language-properties"`  
0.0.4 - added completionProvider for all languageIds and each language's available properties  
0.1.0 - fixed the completionProvider to not delete omitted properties   
 &emsp;&emsp; - scraped and reduced all language configuration files available to me  
 0.1.5 - added filters for comments/brackets and for already used properties in the setting    



-----------------------------------------------------------------------------------------------------------  

