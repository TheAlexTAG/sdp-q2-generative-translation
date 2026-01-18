# LLM Translation Module

This module provides a locally hosted Large Language Model (LLM)
used for real-time, automatic translation of GUI text.

- Model: LLaMA 3.1 8B Instruct (GGUF)
- Runtime: llama.cpp (CUDA-enabled)
- API: OpenAI-compatible HTTP interface

The module is designed to be reusable and framework-agnostic,
so it can be integrated into web-based applications
(e.g. React, Angular) without requiring manual translations.

The LLM runs locally on the host machine and exposes a REST API
used by the rest of the system.
