# Questions before and after the skill

Each pair below shows a question an agent might put to a user while working on a small to-do list app. The first version assumes the reader shares the agent's knowledge. The second follows the skill: it defines every term, numbers the options, and gives each option a Pro and then a Con.

## 1. Where to keep the data

**Without the skill:**

> SQLite or Postgres for persistence?

**With the skill:**

> The app must keep each person's tasks between runs of the program. That is called persistence: data that survives after the program closes. Two ways to do it:
>
> 1. A local database file (SQLite, a database engine that stores everything in one file on the same computer).
>    Pro: nothing to install or run; the file travels with the app.
>    Con: only one program can write to it at a time, and the data lives on one computer.
> 2. A database server (Postgres, a separate program that holds the data and answers requests over a network).
>    Pro: many programs and many computers can share the same data at once.
>    Con: a server must be installed, kept running and protected with an account.
>
> Reply with a number.

## 2. How to run the automated tests

**Without the skill:**

> Want me to use node:test or pull in vitest?

**With the skill:**

> The app needs automated tests: small programs that check the app's behavior and report pass or fail. A test runner is the program that finds those tests and runs them. The choice is which runner to use:
>
> 1. The runner that ships inside Node.js (the program that runs the app's JavaScript).
>    Pro: already installed with Node.js; nothing to download.
>    Con: plainer output and fewer helpers for comparing values.
> 2. A separate test framework downloaded as a dependency (a dependency is a library the project needs installed before it runs).
>    Pro: richer reports and more ways to express a check.
>    Con: one more package to install and keep up to date.
>
> Reply with a number.

## 3. Whether to continue after an error

**Without the skill:**

> The migration step 404'd. Retry or skip?

**With the skill:**

> One step of the setup failed. The step was a migration, a script that changes the shape of the database so the app can use it. It failed because the server it asked answered "not found" (the HTTP status 404, which means the address it requested does not exist). What should happen next?
>
> 1. Run the step again.
>    Pro: a passing network hiccup would be cured and nothing else changes.
>    Con: if the address is really wrong, the retry fails the same way and costs time.
> 2. Skip the step and continue with the rest of the setup.
>    Pro: the remaining steps finish now and can be checked.
>    Con: the database keeps its old shape, so the app may fail later in a less obvious place.
> 3. Stop here.
>    Pro: nothing more is changed until the wrong address is understood.
>    Con: the setup stays unfinished until someone looks into it.
>
> Reply with a number.
