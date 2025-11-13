# Overview

> Consolidated from `docs/00-overview.md` and `docs/QUICK_START.md`. This is the canonical overview.

## Executive Summary

An AI-powered executive assistant that automates email management, document processing, and project coordination using Gmail and Google Workspace integrations. Core value: reduce admin time, centralize project data, and proactively surface actions.

## Quick Start

- Supabase setup: see environment and migration steps in `docs/operations.md` (Setup → Supabase) and `.env.local.example`.
- Run workers: `npm run workers`.
- Trigger a sync: POST `/api/emails/sync` or via Dashboard.

## Problem, Goals, Personas

- Problem: Email overload, manual document processing, scattered project data, repetitive admin tasks, context switching, missed action items.
- Goals: 70% reduction in email time, automated document processing, centralized data, proactive tasks.
- Personas: Solo Consultant, Small Agency Owner, Project Manager.

## Success Metrics

- Launch: 50+ beta users, 1,000+ emails processed, <5 critical bugs.
- 90 days: 100+ users, >85% classification accuracy, 10+ hours saved/user/week.

## Glossary

Agent, Classification, OCR, RLS, SOW, Webhook.

