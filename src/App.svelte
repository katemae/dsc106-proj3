<script>
  import ChartContainer from "./components/ChartContainer.svelte";
  import { energy } from "./data/energy";
  import { onMount } from 'svelte';

  const allEnergy = ["biofuel", "coal", "fossil", "gas", "hydro", "nuclear", "oil", "solar"];
  const renewable = ["biofuel", "hydro", "nuclear", "solar"];
  const nonrenewable = ["coal", "fossil", "gas", "oil"];

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
    Welcome to our project!
    <br>
    Hover over our graph to see the kilowatt-hours of energy generated per source.
    <br>
    <br>
    Each value represents the generated energy from a particular source <em>per capita</em>, meaning the amount of energy generated from a source per person in the US.
  </p>

  <div class="energy-filter">
    <div class="button-container">
      <button on:click={() => handleButtonClick(allEnergy)} on:mouseenter={highlightButton}>All</button>
      <button on:click={() => handleButtonClick(renewable)} on:mouseenter={highlightButton}>Renewables</button>
      <button on:click={() => handleButtonClick(nonrenewable)} on:mouseenter={highlightButton}>Non-Renewables</button>
      <div class="highlight" style={highlightStyle}></div>
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
</main>

<style>
  h1 {
    text-align: center;
  }

  p {
    text-align: center;
    max-width: 600px;
    margin: 0 auto;  
    margin-bottom: 2%;
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

  .energy-filter button {
    margin: 0;
    background-color: transparent;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    z-index: 1;
  }

  .highlight {
    position: absolute;
    background-color: rgba(232, 197, 163, 0.1);
    border-radius: 5px;
    z-index: 0;
    pointer-events: none;
    transition: 0.3s ease-out;
  }

  .energy-filter button:hover {
    background-color: #e5b381b7;
  }
</style>
