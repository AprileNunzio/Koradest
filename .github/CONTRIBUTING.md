# Contributing to KORADEST

First off, thank you for considering contributing to KORADEST! It's people like you that make KORADEST a great platform.

## How Can I Contribute?

### 1. Creating Apps for the Marketplace
KORADEST is a Universal Container. The best way to contribute is by creating new Third-Party Apps!
1. Create your app in an isolated folder.
2. Ensure you have a valid `manifest.json`.
3. Use the `ipc` bridge to safely communicate with Core Apps.
4. Contact NunzioTech to submit your app: the official Marketplace is not hosted on GitHub. You can also publish it from your own repository, which KORADEST users can add from the App Store.

### 2. Contributing to the Core
If you want to improve the KORADEST Universal Container itself:
1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code respects the `try-catch` strict sandboxing rules (never allow third-party apps to crash the core).
5. Issue a pull request!

## Code Style
* Please adhere to the existing code style.
* Remember that KORADEST Core must remain domain-agnostic. Do not introduce business-specific logic (e.g., HR, billing) into the Core. Create a third-party app instead.

Thank you!
