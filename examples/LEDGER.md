# DECISIONS LEDGER FOR sample-project
All notable decisions to this project will be documented in this file.
Intended for local user review only: Never publish to any repository or mention in any public way. For the user's eyes only.

# Where the to-do list app keeps its data

* **Status:** Approved

* **Date:** 2026-10-29T16:07:13-07:00

* **Deciders:** Sam

* **Source:** User interactive decision by Sam

## Context

The to-do list app must keep each person's tasks between runs of the program.

## Considered Options

* **Option 1:** A local file on the user's computer

* **Option 2:** A hosted database

## Decision & Outcome

We chose **Option 1: A local file on the user's computer** because the app has one user per installation and must work offline.

### Consequences

* **Positive:** Nothing to host and no accounts to manage

* **Negative:** Tasks do not follow the user to a second computer

## Pros & Cons of All Options

### Option 1: A local file on the user's computer

* **Pro:** Works with no internet connection and no account

* **Con:** The tasks exist on one computer only

### Option 2: A hosted database

* **Pro:** The same tasks appear on every device the person signs in from

* **Con:** Needs an account, a server and a network connection

# Test runner for the to-do list app

* **Status:** Approved

* **Date:** 2026-10-29T16:07:13-07:00

* **Deciders:** Claude Code

* **Source:** Agentic autonomous decision by Claude Code

## Context

The app needs automated tests and no test runner is set up. A test runner is the program that finds the tests and runs them.

## Considered Options

* **Option 1:** The test runner built into Node.js

* **Option 2:** A third-party test framework

## Decision & Outcome

We chose **Option 1: The test runner built into Node.js** because the project rules prefer tools that need no installation.

### Consequences

* **Positive:** Zero new dependencies

* **Negative:** Plainer test output

## Pros & Cons of All Options

### Option 1: The test runner built into Node.js

* **Pro:** Ships with Node.js, nothing to install

* **Con:** Fewer reporting features than a dedicated framework

### Option 2: A third-party test framework

* **Pro:** Rich assertions and detailed reports

* **Con:** One more dependency to install and keep current

# Release cadence for the to-do list app

* **Status:** Approved

* **Date:** 2026-10-29T16:07:13-07:00

* **Deciders:** Product team

* **Source:** Meeting: "Planning sync" which took place on 2026-10-28T09:00:00-07:00

## Context

The team had to settle how often finished work is released to users.

## Considered Options

* **Option 1:** Release every two weeks on a fixed day

* **Option 2:** Release each change as soon as it is finished

## Decision & Outcome

We chose **Option 1: Release every two weeks on a fixed day** because the team wants predictable dates for support and announcements.

### Consequences

* **Positive:** Support staff can prepare notes before each release day

* **Negative:** Urgent fixes need a separate process outside the cycle

## Pros & Cons of All Options

### Option 1: Release every two weeks on a fixed day

* **Pro:** Users and the team know exactly when changes arrive

* **Con:** A finished fix can wait up to two weeks

### Option 2: Release each change as soon as it is finished

* **Pro:** Fixes reach users immediately

* **Con:** Users see changes at unpredictable times and the team must be ready to release at any moment
