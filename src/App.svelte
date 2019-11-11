<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/spectre.css/dist/spectre.min.css">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
</svelte:head>

<script>
  import Navbar from './components/navbar.svelte';
  export let name;
</script>

<style lang="scss" global>
  @import  "./style/global.scss";
</style>

<Navbar {name}/>

<h1>This is the {name.toUpperCase()} (aka Olivier Cardinaux) interweb!</h1>

<p>
  Here we will have a homepage, a about (resume) and a projects page.
</p>

<p>Then also some photo gallery, and a blog</p>

<p>
  A lot of links to my writings.
</p>

<p>
  Some client work, github, etc.
</p>

