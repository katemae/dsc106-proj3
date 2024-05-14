## Building a line chart using Svelte and D3
This repository refers to an article published on Medium where I explain how to build an interactive line chart using Svelte and D3.
To use these files, just install a Svelte project on your computer and replace the files in the src folder with mine, install D3 and run everything.
A working preview of the chart can be found [here](http://steflyx.com/lineChartSvelte/).

The line chart accepts five props:
 - **chartWidth** - number: the width of the chart
 - **chartHeight** - number: the height of the chart
 - **data** - array of Objects: a json array where each element is an entry of the dataset
 - **xVar** - string: the column to use as x variable
 - **yVars** - array of string: the column(s) to use as y variable
