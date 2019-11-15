<script>
  import Banner from "./components/banner.svelte";
  import Navbar from "./components/navbar.svelte";
  import Blob from "./components/blob.svelte";
  import Footer from "./components/footer.svelte";
</script>

<style lang="scss" global>
  @import "./style/global.scss";

  header {
    position: sticky;
    top: 0;
    left: 0;
    // z-index: 1;
  }
</style>

<header>
  <Banner />
  <Navbar />
</header>
<Blob />
<main>
  <section id="projects">

    <div>
      <h1>
        This is a O68x (aka Olivier Cardinaux) interweb!
      </h1>

      <p>Here we will have a homepage, a about (resume) and a projects page.</p>

      <p>Then also some photo gallery (lampadaires), and a blog</p>

      <p>A lot of links to my writings.</p>

      <p>Some client work, github, etc.</p>
    </div>

  </section>
  <section id="cv">

    <div>
      <h1>
        This resumeee!
      </h1>

      <p>Here we will have a homepage, a about (resume) and a projects page.</p>

      <p>Then also some photo gallery (lampadaires), and a blog</p>

      <p>A lot of links to my writings.</p>

      <p>Some client work, github, etc.</p>
    </div>

  </section>
  <section id="lampadaires">

    <div>
      <h1>
        This lampadeaire!
      </h1>

      <p>Here we will have a homepage, a about (resume) and a projects page.</p>

      <p>Then also some photo gallery (lampadaires), and a blog</p>

      <p>A lot of links to my writings.</p>

      <p>Some client work, github, etc.</p>
    </div>

  </section>
</main>
<section class="footer">
  <Footer />
</section>
