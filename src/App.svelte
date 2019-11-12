<script>
  import Navbar from './components/navbar.svelte';
  import Hero from './components/hero.svelte';
  export let name;
</script>

<style lang="scss" global>
  @import "./style/global.scss";
</style>

<section class="about">
  <Navbar {name} />

  <div>
    <h1>This is the {name.toUpperCase()} (aka Olivier Cardinaux) interweb!</h1>

    <p>
      Here we will have a homepage, a about (resume) and a projects page.
    </p>

    <p>Then also some photo gallery (lampadaires), and a blog</p>

    <p>
      A lot of links to my writings.
    </p>

    <p>
      Some client work, github, etc.
    </p>
  </div>

  <Hero />
  </section>
  <section>
    <p>
      More stuff…
    </p>
  </section>
