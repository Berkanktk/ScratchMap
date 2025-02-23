<script>
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";
  import { faUser, faCoffee } from "@fortawesome/free-solid-svg-icons";
</script>

<footer>
  <div class="social-icons">
    <a
      href="https://www.berkankutuk.dk"
      target="_blank"
      aria-label="Visit my website"
    >
      <FontAwesomeIcon icon={faUser} />
    </a>
    <a
      href="https://www.twitter.com/berkanktk"
      target="_blank"
      aria-label="Follow me on Twitter"
    >
      <FontAwesomeIcon icon={faTwitter} />
    </a>
    <a
      href="https://github.com/Berkanktk/ScratchMap"
      target="_blank"
      aria-label="View the source code on GitHub"
    >
      <FontAwesomeIcon icon={faGithub} />
    </a>
    <div class="coffee">
      <a
        href="https://www.buymeacoffee.com/berkanktk"
        target="_blank"
        title="Buy me a coffee?"
        aria-label="Buy me a coffee"
      >
        <FontAwesomeIcon icon={faCoffee} />
      </a>
    </div>
  </div>
</footer>

<style>
  footer {
    display: flex;
    justify-content: right;
    align-items: right;
    margin-top: 0px;
    color: #fff;
  }

  .social-icons {
    display: flex;
  }

  .social-icons a {
    color: #fff;
    margin-right: 20px;
    font-size: 20px;
  }

  .social-icons a:hover {
    color: #c96;
  }

  .coffee {
    animation: shake 1.75s infinite;
  }

  @keyframes shake {
    0% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(0, 0);
    }
    50% {
      transform: translate(0, -2px);
      transition: transform 330ms ease-in-out;
    }
    75% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(0, 0);
    }
  }

  a[title]:hover::after {
    content: attr(title);
    font-size: 18px;
    position: absolute;
    top: -50px;
    left: -50px;
  }
</style>
