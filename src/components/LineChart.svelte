<script>
    import * as d3 from "d3";
    export let data;

    export let width = 1000;
    export let height = 500;
    export let marginTop = 40;
    export let marginRight = 20;
    export let marginBottom = 50;
    export let marginLeft = 50;

    // Parse dates to create the x scale.
    data.forEach(d => {
        d.year = new Date(d.year, 0); // Assuming the year is the first day of January
    });

    const xScale = d3.scaleTime()
        // .domain([new Date(2000, 0), new Date(2018, 0)])
        .domain(
        [
            new Date(2000, 0),
            new Date(2018, 0)
        ]
        )
        .range([marginLeft, width - marginRight]);

    // Create the y scale.
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max([
            d.biofuel,
            d.coal,
            d.gas,
            d.hydro,
            d.low_carbon,
            d.nuclear,
            d.oil,
            d.solar,
            d.wind
        ]) + 100 )])
        .range([height - marginBottom, marginTop]);
    
    // Create the line generator.
    const bio_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.biofuel));
    
    const coal_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.coal));
    
    const gas_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.gas));
    
    const hydro_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.hydro));
    
    const nuclear_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.nuclear));
    
    const oil_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.oil));
    
    const solar_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.solar));
    
    const wind_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.wind));

    const markGenerator = d3.symbol()
        .type(d3.symbolCircle)
        .size(500);

    // Allows lines to be drawn in an "each" loop.
    let lines = [
        bio_line, coal_line, gas_line, hydro_line, nuclear_line, oil_line, solar_line, wind_line
    ];

    // const lineIndex = {bio_line: 0, coal_line: 1, gas_line: 2, hydro_line: 3, nuclear_line: 4, oil_line: 5, solar_line: 6, wind_line: 7};

    function lineIndexer(line) {
        switch (line) {
            case bio_line:
                return 0;
            case coal_line:
                return 1;
            case gas_line:
                return 2;
            case hydro_line:
                return 3;
            case nuclear_line:
                return 4;
            case oil_line:
                return 5;
            case solar_line:
                return 6;
            case wind_line:
                return 7;
            default:
                return null;
        }
    }

    const lineColor = d3.scaleLinear()
        .domain([0, 1, 2, 3, 4, 5, 6, 7])
        .range(["steelblue", "red", "orange", "green", "blue", "black", "cyan", "yellow"]);
    
    // Variables for handling hovered lines
    let hovered = -1;
    let recorded_mouse_position = {
		x: 0, y: 0
	};

    // Create data markers.
    const data_markers = [];
    
    function fill_data_markers(line_index) {
        const line_dict = {0: "biofuel", 1: "coal", 2: "gas", 3: "hydro", 4: "nuclear", 5: "oil", 6: "solar", 7: "wind"}
        const line_name = line_dict[line_index]
        for (let i = 0; i < data.length; i++) {
            data_markers[i] = `${xScale(data[i]["year"])},${yScale(data[i][line_name])}`
        }
    }

    fill_data_markers("biofuel");
    console.log(data_markers)
    // function create_data_markers() {
    //     marker_container = d3.select("svg")
    //         .append('circle')
    //         .attr('cx', '50%')
    //         .attr('cy', '50%')
    //         .attr('r', 20)
    //         .style('fill', 'green');
    // }
</script>

<div class="visualization">
<svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    style:max-width="100%"
    style:height="auto"
>
    <!-- X-Axis -->
    <g transform="translate(0,{height - marginBottom})">
        <line stroke="currentColor" x1={marginLeft - 6} x2={width} />

        {#each xScale.ticks() as tick}
            <!-- X-Axis Ticks -->
            <line
                stroke="currentColor"
                x1={xScale(tick)}
                x2={xScale(tick)}
                y1={0}
                y2={6}
            />

            <!-- X-Axis Tick Labels -->
            <text fill="currentColor" text-anchor="middle" x={xScale(tick)} y={22}>
                {tick.getFullYear()}
            </text>
        {/each}
    </g>

    <!-- Y-Axis and Grid Lines -->
    <g transform="translate({marginLeft},0)">
        {#each yScale.ticks() as tick}
            {#if tick !== 0}
                <!-- 
                    Grid Lines. 
                    Note: First line is skipped since the x-axis is already present at 0. 
                -->
                <line
                    stroke="currentColor"
                    stroke-opacity="0.1"
                    x1={0}
                    x2={width - marginLeft}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                />

                <!-- 
                    Y-Axis Ticks. 
                    Note: First tick is skipped since the x-axis already acts as a tick. 
                -->
                <line
                    stroke="currentColor"
                    x1={0}
                    x2={-6}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                />
            {/if}

            <!-- Y-Axis Tick Labels -->
            <text
                fill="currentColor"
                text-anchor="end"
                dominant-baseline="middle"
                x={-9}
                y={yScale(tick)}
            >
                {tick}
            </text>
        {/each}

        <!-- Y-Axis Label -->
        <text fill="currentColor" text-anchor="start" x={-marginLeft} y={15}>
            Energy Source Generation Per Capita
        </text>
    </g>

    <!-- Plot Line Paths -->
    {#each lines as line_gen}
        <path
            fill="none"
            stroke={lineColor(lineIndexer(line_gen))}
            stroke-width="5"
            d={line_gen(data)}
            on:mouseover={(event) => { 
                hovered = lineIndexer(line_gen);
                recorded_mouse_position = {
                        x: event.pageX,
                        y: event.pageY
                    }
            }}
            on:mouseout={(event) => { hovered = -1; }}
        />
        {#if hovered !== -1}
            {fill_data_markers(hovered)}
            {#each data_markers as mark}
                <path
                fill={lineColor(hovered)}
                transform="translate({mark})"
                d={markGenerator()}
                />
            {/each}
            <path
            fill="none"
            stroke={lineColor(hovered)}
            stroke-width="10"
            d={lines[hovered](data)}
            on:mouseover={(event) => { 
                hovered = lineIndexer(line_gen);
                recorded_mouse_position = {
                        x: event.pageX,
                        y: event.pageY
                    }
            }}
            />  
        {/if}

    {/each}
</svg>
    <div
            class={hovered === -1 ? "tooltip-hidden": "tooltip-visible"}
            style="left: {recorded_mouse_position.x}px; top: {recorded_mouse_position.y}px"	
        >
            {#if hovered !== -1}
                Hello! This is a test to see if {hovered} works.
            {/if}
    </div>
</div>

<style>
	.visualization {
		font: "Open Sans";
		margin: auto;
		margin-top: 1px;
		text-align: middle;
	}

	/* dynamic classes for the tooltip */
	.tooltip-hidden {
		visibility: hidden;
		font-family: "Nunito", sans-serif;
		width: 200px;
		position: absolute;
	}

	.tooltip-visible {
		font: 25px sans-serif;
		font-family: "Nunito", sans-serif;
		visibility: visible;
		background-color: #f0dba8;
		border-radius: 10px;
		width: 200px;
		color: black;
		position: absolute;
		padding: 10px;
	}
</style>