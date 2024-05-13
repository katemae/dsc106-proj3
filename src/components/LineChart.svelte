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
    
    const low_carbon_line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.low_carbon));
    
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
        
        // console.log(bio_line(data));
</script>
    
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
    <path
        fill="none"
        stroke="steelblue"
        stroke-width="1.5"
        d={bio_line(data)}
    />
    <path
        fill="none"
        stroke="red"
        stroke-width="1.5"
        d={coal_line(data)}
    />
    <path
        fill="none"
        stroke="orange"
        stroke-width="1.5"
        d={gas_line(data)}
    />
    <path
        fill="none"
        stroke="green"
        stroke-width="1.5"
        d={hydro_line(data)}
    />
    <path
        fill="none"
        stroke="blue"
        stroke-width="1.5"
        d={nuclear_line(data)}
    />
    <path
        fill="none"
        stroke="black"
        stroke-width="1.5"
        d={oil_line(data)}
    />
    <path
        fill="none"
        stroke="cyan"
        stroke-width="1.5"
        d={solar_line(data)}
    />
    <path
        fill="none"
        stroke="yellow"
        stroke-width="1.5"
        d={wind_line(data)}
    />
</svg>
    