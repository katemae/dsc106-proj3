<script>
  import ChartContainer from "./components/ChartContainer.svelte";
  import { energy } from "./data/energy";
  import { onMount } from 'svelte';

  // Define the y-axis variable sets
  const allYVars = ["biofuel", "coal", "fossil", "gas", "hydro", "nuclear", "oil", "solar"];
  const renewableYVars = ["biofuel", "hydro", "nuclear", "solar"];
  const nonRenewableYVars = ["coal", "fossil", "gas", "oil"];

  // Define a variable to keep track of the currently selected y-axis variable set
  let selectedYVars = allYVars;

  // Function to handle button click events
  function handleButtonClick(newYVars) {
    selectedYVars = newYVars;
  }
</script>

<main>
  <h1>Energy Generation in the US</h1>

  <p>Descriptive text...</p>

  <!-- Buttons for toggling between different y-axis variable sets -->
  <div class="energy-filter">
    <button on:click={() => handleButtonClick(allYVars)}>All</button>
    <button on:click={() => handleButtonClick(renewableYVars)}>Renewables</button>
    <button on:click={() => handleButtonClick(nonRenewableYVars)}>Non-Renewables</button>
  </div>

  <!-- Chart Container component -->
  <ChartContainer
    type={"lineChart"}
    chartProps={{
      data: energy,
      xVar: "year",
      yVars: selectedYVars, // Pass the selected y-axis variable set to the chart
    }}
  />
</main>

<style>
  h1 {
    text-align: center;
  }

  p {
    text-align: center;
  }

  .energy-filter {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .energy-filter button {
    margin: 0 5px;
  }

</style>
