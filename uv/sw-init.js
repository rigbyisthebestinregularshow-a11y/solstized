// Load UV in correct order: bundle first (defines Ultraviolet), then config, then worker
importScripts('/uv/uv.bundle.js', '/uv/uv.config.js', '/uv/uv.sw.js');
