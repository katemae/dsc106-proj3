<script>
  import ChartContainer from "./components/ChartContainer.svelte";
  import { energy } from "./data/energy";
  import { onMount } from 'svelte';

  const allEnergy = ["biofuel", "coal", "fossil", "gas", "hydro", "nuclear", "oil", "solar", "wind"];
  const renewable = ["biofuel", "solar", "wind"];
  const nonrenewable = ["coal", "fossil", "gas", "hydro", "nuclear", "oil"];

  let selectedEnergy = allEnergy;

  function handleButtonClick(newYVars) {
    selectedEnergy = newYVars;
  }

  let highlightStyle = {
    top: "0px",
    left: "0px",
    width: "100px",
    height: "100%",
    opacity: 0,
  };

  function highlightButton(event) {
    const rect = event.target.getBoundingClientRect();
    highlightStyle = {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      opacity: 1,
    };
  }
</script>

<main>
  <h1>Energy Generation Per Capita in the US</h1>

  <p>
    Welcome to our project, where we answer the following data science question:
    <br>
    <b>How does the production of renewable energy sources compare to non-renewable energy over time?</b>
    <br>
    <br>
    Hover over our graph to see the kilowatt-hours of energy generated per source!
    <br>
    Each value represents the generated energy from a particular source <em>per capita</em>,
    meaning the amount of energy generated from a source averaged per person specifically in the US.
  </p>

  <!-- <div class="energy-filter">
    <div class="button-container">
      <button on:click={() => handleButtonClick(allEnergy)} on:mouseenter={highlightButton}>All</button>
      <button on:click={() => handleButtonClick(renewable)} on:mouseenter={highlightButton}>Renewables</button>
      <button on:click={() => handleButtonClick(nonrenewable)} on:mouseenter={highlightButton}>Non-Renewables</button>
      <div class="highlight" style={highlightStyle}></div>
    </div>
  </div> -->


  <div class="energy-filter">
    <div class="button-container">
      <input type="radio" id="all-energy" name="buttons" checked on:change={() => handleButtonClick(allEnergy)}>
      <label for="all-energy">All</label>
      <input type="radio" id="renewables" name="buttons" on:change={() => handleButtonClick(renewable)}>
      <label for="renewables">Renewables</label>
      <input type="radio" id="non-renewables" name="buttons" on:change={() => handleButtonClick(nonrenewable)}>
      <label for="non-renewables">Non-Renewables</label>
    </div>
  </div>

  <ChartContainer
    type={"lineChart"}
    chartProps={{
      data: energy,
      xVar: "year",
      yVars: selectedEnergy,
    }}
  />

  <h2>Write-Up</h2>
  <div class="writeup">
    <p style="text-align: justify; text-justify: inter-word;">
      <!-- [ERASE THIS LINE AFTER COMPLETION: A rationale for your design decisions. How did you choose your particular visual encodings and interaction techniques? What alternatives did you consider and how did you arrive at your ultimate choices?] <br> -->
      For our graphic, we chose to answer our data science question with a visual displaying the change in the production of different energy sources over time.
      We encoded this information using lines as our mark, indicating the continuous relation as these values change over time. Paired with the qualitative color-coding of our lines and position channels
      indicated by our x and y-axis scales, our graphic clearly depicts the magnitude of energy production over the course of 18 years. 
      Initially, we considered creating an interactive bar or pie chart that would shift between years. 
      However, we settled on a line chart as our final product because line charts are great at depicting change over time. 
      It also allowed for easy comparison between energy sources, as we were able to highlight each year based on where the mouse was hovered.

      <br>
      <br>

      <!-- [ERASE THIS LINE AFTER COMPLETION: An overview of your development process. Describe how the work was split among the team members. Include a commentary on the development process, including answers to the following questions: Roughly how much time did you spend developing your application (in people-hours)? What aspects took the most time?] <br> -->
      The authors, <a href="https://github.com/katemae">Katelyn</a> and <a href="https://github.com/jman2-go">Jonathan</a>, both contributed to the idea development process and data gathering for this project, spending about an hour each.
      Both authors then developed an initial draft for the project, taking about 3 hours. The draft was completely static at first, only plotting the lines without any interactivity.
      To make it interactive, each author worked on a different aspect: Jonathan worked on making the graph hoverable with a tooltip, while Katelyn worked on making the buttons to swap between energy production types. Both aspects took around 4-6 hours, making interactivity the lengthiest portion of the project.
      Finally, Katelyn built the styling for the website, and designed the final appearance of the plot using a template. She made the code compatible to be deployed through github, which overall took another 3 hours.

      <br>
      
    </p>
    <p style="text-align: center;">
      Thanks for checking out our project!
    </p>
  </div>
  
</main>

<style>
  h1 {
    text-align: center;
  }

  h2 {
    text-align: center;
  }

  p {
    text-align: center;
    max-width: 600px;
    margin: 0 auto;  
    margin-bottom: 2%;
  }

  .writeup {
    padding-bottom: 2%;
  }

  input {
    display: none;
  }

  label {
    display: inline-block;
  }

  .energy-filter {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    position: relative;
  }

  .button-container {
    border: 2px solid #e6ccb2;
    border-radius: 5px;
    overflow: hidden;
    position: relative;
  }

  /* .energy-filter button, */
  .energy-filter label {
    margin: 0;
    background-color: transparent;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    z-index: 1;
  }

  /* .highlight {
    position: absolute;
    background-color: rgba(232, 197, 163, 0.1);
    border-radius: 5px;
    z-index: 0;
    pointer-events: none;
    transition: 0.3s ease-out;
  } */

  /* .energy-filter button:hover, */
  .energy-filter label:hover {
    background-color: #e5b381b7;
  }

  input:checked + label {
    background-color: #e5b381b7;
  }
</style>
