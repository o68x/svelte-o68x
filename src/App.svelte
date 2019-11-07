<script>
  import Navbar from './components/navbar.svelte';
  export let name;
</script>

<style lang="scss" global>
  @import  "./style/global.scss";
</style>

<div class="navbar">
  <Navbar {name}/>
</div>

<h1>This is the {name.toLowerCase()} interweb!</h1>

<p>
  Here we will have a homepage, a about (resume) and a projects page.
</p>

<p>Then also some photo gallery, and a blog</p>

<p>
  A lot of links to my writings.
</p>

<p>
  Some client work, github etc.
</p>

