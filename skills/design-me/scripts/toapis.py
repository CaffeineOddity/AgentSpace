#!/usr/bin/env python3
"""ToAPIs 能力封装脚本。

接入 ToAPIs 的图像生成、视频生成、文件上传能力，
为 design skill 提供设计产出的生成后端。

API 文档：https://docs.toapis.com/docs/cn/quickstart

配置：在 design/config/.env 中设置 TOAPIS_API_KEY（不上传）。
"""

import json
import os
import random
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Optional, Union, Any


# ────────────────────────── 配置 ──────────────────────────

DEFAULT_BASE_URL = "https://toapis.com"
CONFIG_ENV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "config",
    ".env",
)


def _load_env_file(env_path: str) -> dict[str, str]:
    """从 .env 文件读取键值对，不依赖第三方库。

    仅解析 KEY=VALUE 行，忽略注释与空行。值去引号。
    """
    if not os.path.exists(env_path):
        return {}
    result: dict[str, str] = {}
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                result[key] = value
    return result


def _resolve_config() -> dict[str, str]:
    """合并环境变量与 .env 文件，环境变量优先。

    优先级：进程环境变量 > design/config/.env。
    """
    file_env = _load_env_file(CONFIG_ENV_PATH)
    merged: dict[str, str] = {}
    merged.update(file_env)
    # 进程环境变量覆盖文件值
    for key in ("TOAPIS_API_KEY", "TOAPIS_BASE_URL", "TOAPIS_IMAGE_MODEL", "TOAPIS_VIDEO_MODEL"):
        val = os.environ.get(key)
        if val:
            merged[key] = val
    return merged


def _require_api_key(config: dict[str, str]) -> str:
    """获取 API Key，缺失时显式抛错。"""
    key = config.get("TOAPIS_API_KEY", "")
    if not key:
        raise RuntimeError(
            "缺少 TOAPIS_API_KEY。请在 design/config/.env 中设置，"
            "或通过环境变量 TOAPIS_API_KEY 传入。"
        )
    return key


def _resolve_base_url(config: dict[str, str]) -> str:
    """获取 Base URL，默认 https://toapis.com。"""
    return config.get("TOAPIS_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


# ────────────────────────── 数据结构 ──────────────────────────


@dataclass
class TaskResult:
    """异步任务的最终结果。"""

    task_id: str
    status: str
    url: str = ""
    progress: int = 0
    model: str = ""
    error_code: str = ""
    error_message: str = ""
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def is_completed(self) -> bool:
        return self.status == "completed"

    @property
    def is_failed(self) -> bool:
        return self.status == "failed"


@dataclass
class ImageGenParams:
    """图像生成参数，严格类型，非松散字典。"""

    model: str
    prompt: str
    size: str = "1:1"
    resolution: str = "1k"
    n: int = 1
    background: str = ""
    reference_images: list[str] = field(default_factory=list)
    response_format: str = "url"
    client_business_id: str = ""

    def to_payload(self) -> dict[str, Any]:
        """转为 API 请求体，空值不传。"""
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": self.prompt,
            "size": self.size,
            "resolution": self.resolution,
            "n": self.n,
            "response_format": self.response_format,
        }
        if self.background:
            payload["background"] = self.background
        if self.reference_images:
            payload["reference_images"] = self.reference_images
            payload["image_urls"] = self.reference_images
        if self.client_business_id:
            payload["client_business_id"] = self.client_business_id
        return payload


@dataclass
class VideoGenParams:
    """视频生成参数，严格类型。"""

    model: str
    prompt: str
    duration: int = 0
    aspect_ratio: str = ""
    image_urls: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    client_business_id: str = ""

    def to_payload(self) -> dict[str, Any]:
        """转为 API 请求体，空值不传。"""
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": self.prompt,
        }
        if self.duration:
            payload["duration"] = self.duration
        if self.aspect_ratio:
            payload["aspect_ratio"] = self.aspect_ratio
        if self.image_urls:
            payload["image_urls"] = self.image_urls
        if self.metadata:
            payload["metadata"] = self.metadata
        if self.client_business_id:
            payload["client_business_id"] = self.client_business_id
        return payload


@dataclass
class UploadResult:
    """文件上传结果。"""

    url: str
    file_id: str = ""
    mime_type: str = ""
    size: int = 0


# ────────────────────────── HTTP 底层 ──────────────────────────


def _http_request(
    method: str,
    url: str,
    api_key: str,
    *,
    json_body: Optional[dict[str, Any]] = None,
    form_data: Optional[bytes] = None,
    content_type: str = "",
    timeout: int = 60,
) -> dict[str, Any]:
    """发送 HTTP 请求并解析 JSON 响应。

    用标准库 urllib，不依赖 requests。失败时显式抛错，
    错误信息含状态码与响应体。
    """
    headers: dict[str, str] = {"Authorization": f"Bearer {api_key}"}
    data: Optional[bytes] = None

    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif form_data is not None:
        data = form_data
        if content_type:
            headers["Content-Type"] = content_type

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"HTTP {exc.code} {exc.reason} 请求: {method} {url} 响应: {body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"网络请求失败: {method} {url} 原因: {exc.reason}") from exc


def _build_multipart(
    file_field: str,
    file_path: str,
    file_content: bytes,
    extra_fields: dict[str, str],
) -> tuple[bytes, str]:
    """构建 multipart/form-data 请求体，返回 (body, content_type)。"""
    boundary = f"----ToAPIsBoundary{random.randint(100000, 999999)}"
    lines: list[bytes] = []
    for key, val in extra_fields.items():
        lines.append(f"--{boundary}".encode())
        lines.append(f'Content-Disposition: form-data; name="{key}"'.encode())
        lines.append(b"")
        lines.append(val.encode("utf-8"))
    filename = os.path.basename(file_path)
    lines.append(f"--{boundary}".encode())
    lines.append(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"'.encode()
    )
    lines.append(b"Content-Type: application/octet-stream")
    lines.append(b"")
    lines.append(file_content)
    lines.append(f"--{boundary}--".encode())
    lines.append(b"")
    body = b"\r\n".join(lines)
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type


# ────────────────────────── 任务查询 ──────────────────────────


def _parse_task_result(data: dict[str, Any]) -> TaskResult:
    """从任务状态响应解析出 TaskResult。"""
    result = TaskResult(
        task_id=str(data.get("id", "")),
        status=str(data.get("status", "unknown")),
        progress=int(data.get("progress", 0)),
        model=str(data.get("model", "")),
        raw=data,
    )
    if result.status == "completed":
        result_data = data.get("result") or {}
        items = result_data.get("data") or []
        if items and isinstance(items, list):
            result.url = str(items[0].get("url", ""))
    if result.status == "failed":
        err = data.get("error") or {}
        result.error_code = str(err.get("code", ""))
        result.error_message = str(err.get("message", ""))
    return result


def get_image_task_status(task_id: str, config: Optional[dict[str, str]] = None) -> TaskResult:
    """查询图片生成任务状态。

    task_id 也可传创建时设置的 client_business_id。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    data = _http_request("GET", f"{base_url}/v1/images/generations/{task_id}", api_key)
    return _parse_task_result(data)


def get_video_task_status(task_id: str, config: Optional[dict[str, str]] = None) -> TaskResult:
    """查询视频生成任务状态。

    task_id 也可传创建时设置的 client_business_id。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    data = _http_request("GET", f"{base_url}/v1/videos/generations/{task_id}", api_key)
    return _parse_task_result(data)


def wait_for_image(
    task_id: str,
    config: Optional[dict[str, str]] = None,
    max_wait: int = 120,
    interval: int = 5,
) -> TaskResult:
    """轮询图片任务直到完成/失败/超时。

    遵循文档建议：初始等待 5 秒，间隔 5-10 秒加抖动。
    429 时读 Retry-After 指数退避。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    current_interval = interval
    start = time.time()
    # 初始等待
    time.sleep(current_interval)
    while time.time() - start < max_wait:
        try:
            data = _http_request(
                "GET", f"{base_url}/v1/images/generations/{task_id}", api_key
            )
        except RuntimeError as exc:
            if "HTTP 429" in str(exc):
                retry = current_interval * 2
                time.sleep(retry + random.uniform(0, 1))
                current_interval = min(current_interval * 2, 60)
                continue
            raise
        result = _parse_task_result(data)
        if result.is_completed:
            return result
        if result.is_failed:
            return result
        time.sleep(current_interval + random.uniform(0, 1))
    raise TimeoutError(f"图片任务 {task_id} 超时（{max_wait}秒）")


def wait_for_video(
    task_id: str,
    config: Optional[dict[str, str]] = None,
    max_wait: int = 600,
    interval: int = 10,
) -> TaskResult:
    """轮询视频任务直到完成/失败/超时。

    遵循文档建议：初始等待 5 秒，间隔 10 秒加抖动，最大 600 秒。
    429 时读 Retry-After 指数退避。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    current_interval = interval
    start = time.time()
    # 初始等待 5 秒
    time.sleep(5)
    while time.time() - start < max_wait:
        try:
            data = _http_request(
                "GET", f"{base_url}/v1/videos/generations/{task_id}", api_key
            )
        except RuntimeError as exc:
            if "HTTP 429" in str(exc):
                retry = current_interval * 2
                time.sleep(retry + random.uniform(0, 1))
                current_interval = min(current_interval * 2, 120)
                continue
            raise
        result = _parse_task_result(data)
        if result.is_completed:
            return result
        if result.is_failed:
            return result
        time.sleep(current_interval + random.uniform(0, 1))
    raise TimeoutError(f"视频任务 {task_id} 超时（{max_wait}秒）")


# ────────────────────────── 图像生成 ──────────────────────────


def create_image_task(
    params: ImageGenParams,
    config: Optional[dict[str, str]] = None,
) -> str:
    """提交图像生成任务，返回任务 ID。

    异步任务，需用 wait_for_image 轮询或 get_image_task_status 查询。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    data = _http_request(
        "POST",
        f"{base_url}/v1/images/generations",
        api_key,
        json_body=params.to_payload(),
    )
    task_id = str(data.get("id", ""))
    if not task_id:
        raise RuntimeError(f"创建图像任务响应缺少 id: {data}")
    return task_id


def generate_image(
    params: ImageGenParams,
    config: Optional[dict[str, str]] = None,
    max_wait: int = 120,
) -> TaskResult:
    """一站式图像生成：提交任务 + 轮询等待，返回最终结果。

    适用于不需要中间操作的单次生成场景。
    """
    cfg = config or _resolve_config()
    task_id = create_image_task(params, cfg)
    return wait_for_image(task_id, cfg, max_wait=max_wait)


# ────────────────────────── 视频生成 ──────────────────────────


def create_video_task(
    params: VideoGenParams,
    config: Optional[dict[str, str]] = None,
) -> str:
    """提交视频生成任务，返回任务 ID。

    异步任务，需用 wait_for_video 轮询或 get_video_task_status 查询。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    data = _http_request(
        "POST",
        f"{base_url}/v1/videos/generations",
        api_key,
        json_body=params.to_payload(),
    )
    task_id = str(data.get("id", ""))
    if not task_id:
        raise RuntimeError(f"创建视频任务响应缺少 id: {data}")
    return task_id


def generate_video(
    params: VideoGenParams,
    config: Optional[dict[str, str]] = None,
    max_wait: int = 600,
) -> TaskResult:
    """一站式视频生成：提交任务 + 轮询等待，返回最终结果。

    适用于不需要中间操作的单次生成场景。
    """
    cfg = config or _resolve_config()
    task_id = create_video_task(params, cfg)
    return wait_for_video(task_id, cfg, max_wait=max_wait)


# ────────────────────────── 文件上传 ──────────────────────────


def upload_image(
    file_path: str,
    config: Optional[dict[str, str]] = None,
    purpose: str = "generation",
) -> UploadResult:
    """上传图片获取 URL，用于图像/视频生成的参考图。

    支持 JPEG/PNG/WebP/GIF，最大 10MB。
    不再支持 base64 内联，必须先上传获取 URL。
    """
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"图片文件不存在: {file_path}")
    with open(file_path, "rb") as f:
        content = f.read()
    body, content_type = _build_multipart(
        "file", file_path, content, {"purpose": purpose}
    )
    data = _http_request(
        "POST",
        f"{base_url}/v1/uploads/images",
        api_key,
        form_data=body,
        content_type=content_type,
        timeout=120,
    )
    if not data.get("success"):
        raise RuntimeError(f"上传图片失败: {data.get('message', data)}")
    result_data = data.get("data") or {}
    return UploadResult(
        url=str(result_data.get("url", "")),
        file_id=str(result_data.get("id", "")),
        mime_type=str(result_data.get("mime_type", "")),
        size=int(result_data.get("size", 0)),
    )


def upload_video(
    file_path: str,
    config: Optional[dict[str, str]] = None,
    purpose: str = "generation",
) -> UploadResult:
    """上传视频获取 URL，用于视频生成的参考视频输入。"""
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"视频文件不存在: {file_path}")
    with open(file_path, "rb") as f:
        content = f.read()
    body, content_type = _build_multipart(
        "file", file_path, content, {"purpose": purpose}
    )
    data = _http_request(
        "POST",
        f"{base_url}/v1/uploads/videos",
        api_key,
        form_data=body,
        content_type=content_type,
        timeout=180,
    )
    if not data.get("success"):
        raise RuntimeError(f"上传视频失败: {data.get('message', data)}")
    result_data = data.get("data") or {}
    return UploadResult(
        url=str(result_data.get("url", "")),
        file_id=str(result_data.get("id", "")),
        mime_type=str(result_data.get("mime_type", "")),
        size=int(result_data.get("size", 0)),
    )


def upload_audio(
    file_path: str,
    config: Optional[dict[str, str]] = None,
    purpose: str = "generation",
) -> UploadResult:
    """上传音频获取 URL，用于音频相关接口。"""
    cfg = config or _resolve_config()
    api_key = _require_api_key(cfg)
    base_url = _resolve_base_url(cfg)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"音频文件不存在: {file_path}")
    with open(file_path, "rb") as f:
        content = f.read()
    body, content_type = _build_multipart(
        "file", file_path, content, {"purpose": purpose}
    )
    data = _http_request(
        "POST",
        f"{base_url}/v1/uploads/audios",
        api_key,
        form_data=body,
        content_type=content_type,
        timeout=180,
    )
    if not data.get("success"):
        raise RuntimeError(f"上传音频失败: {data.get('message', data)}")
    result_data = data.get("data") or {}
    return UploadResult(
        url=str(result_data.get("url", "")),
        file_id=str(result_data.get("id", "")),
        mime_type=str(result_data.get("mime_type", "")),
        size=int(result_data.get("size", 0)),
    )


# ────────────────────────── 下载保存 ──────────────────────────


def download_file(
    url: str,
    save_path: str,
    config: Optional[dict[str, str]] = None,
    timeout: int = 120,
) -> str:
    """下载生成的图片/视频到本地。

    生成的 URL 有效期 24 小时，须及时下载保存。
    """
    headers: dict[str, str] = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36",
        "Referer": "https://toapis.com",
    }
    # 生成结果 URL 通常无需认证，但预留
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"下载失败 HTTP {exc.code}: {url} 响应: {body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"下载失败: {url} 原因: {exc.reason}") from exc
    save_dir = os.path.dirname(save_path)
    if save_dir:
        os.makedirs(save_dir, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(content)
    return save_path


# ────────────────────────── 模型常量 ──────────────────────────

# 图像模型一览（常用）
IMAGE_MODELS = {
    "gpt-image-2": "GPT-Image-2，文生图+图生图，支持透明背景",
    "gpt-image-2-vip": "GPT-Image-2 VIP，全部常用宽高比",
    "gpt-image-2.5-flare": "GPT-Image-2.5 Flare",
    "gpt-image-2.5-sunburst": "GPT-Image-2.5 Sunburst",
    "gpt-4o-image": "GPT-4o 图像生成",
    "gemini-3-pro-image-preview": "Gemini 3 Pro Image",
    "gemini-3.1-flash": "Gemini 3.1 Flash Image",
    "gemini-2.5-flash-image-preview": "Gemini 2.5 Flash Image（Nano Banana）",
    "qwen-image-3.0": "Qwen Image 3.0",
    "seedream-4.5": "Seedream 4.5",
    "seedream-5.0": "Seedream 5.0 lite",
    "seedream-5.0-pro": "Seedream 5.0 Pro",
    "flux-2": "Flux 2.0",
    "flux-kontext": "Flux Kontext 图片编辑",
    "grok-image": "Grok 图像生成",
    "grok-imagine-1.0": "Grok Imagine 1.0",
}

# 视频模型一览（常用）
VIDEO_MODELS = {
    "sora-2-vvip": "Sora2，文生视频+图生视频+角色引用",
    "veo3.1-fast": "Veo3 快速版",
    "veo3.1-quality": "Veo3 高质量版",
    "veo3.1-lite": "Veo3 轻量版",
    "kling-v3": "Kling v3",
    "kling-3.0-turbo": "Kling 3.0 Turbo",
    "seedance-2": "Seedance 2",
    "seedance-2-5": "Seedance 2.5",
    "minimax-hailuo-2.3": "MiniMax Hailuo 2.3",
    "wan2.6": "万相 Wan2.6",
    "vidu-q3": "Vidu Q3",
    "grok-video": "Grok Video",
}

# 图像尺寸对照（1k 分辨率）
IMAGE_SIZE_PIXELS = {
    "1:1": (1024, 1024),
    "3:2": (1536, 1024),
    "2:3": (1024, 1536),
    "4:3": (1024, 768),
    "3:4": (768, 1024),
    "5:4": (1280, 1024),
    "4:5": (1024, 1280),
    "16:9": (1536, 864),
    "9:16": (864, 1536),
    "2:1": (2048, 1024),
    "1:2": (1024, 2048),
    "21:9": (2016, 864),
    "9:21": (864, 2016),
}


# ────────────────────────── CLI 入口 ──────────────────────────


def _resolve_prompt(args: argparse.Namespace) -> str:
    """解析提示词：--prompt-file 读文件（文件全文即模型输入），与 --prompt 二选一互斥。"""
    prompt_file = getattr(args, "prompt_file", "")
    prompt = getattr(args, "prompt", "")
    if prompt_file and prompt:
        raise SystemExit("❌ --prompt 与 --prompt-file 二选一，不可同时给出")
    if prompt_file:
        from pathlib import Path

        return Path(prompt_file).read_text(encoding="utf-8")
    if not prompt:
        raise SystemExit("❌ 缺提示词：须提供 --prompt 或 --prompt-file 之一")
    return prompt


# 图像/视频默认模型（可被 config/.env 的 TOAPIS_IMAGE_MODEL / TOAPIS_VIDEO_MODEL 覆盖，
# 进程环境变量同键亦可覆盖；--model 显式参数优先级最高）
DEFAULT_IMAGE_MODEL = "gpt-image-2"
DEFAULT_VIDEO_MODEL = "veo3.1-fast"

ENV_MODEL_KEYS = {
    "image": "TOAPIS_IMAGE_MODEL",
    "video": "TOAPIS_VIDEO_MODEL",
}


def _resolve_model(args_model: str, command: str) -> str:
    """解析模型：--model 显式参数 > 环境变量/.env 键 > 内置默认值。"""
    if args_model:
        return args_model
    config = _resolve_config()
    model = config.get(ENV_MODEL_KEYS[command], "")
    if not model:
        model = DEFAULT_IMAGE_MODEL if command == "image" else DEFAULT_VIDEO_MODEL
    return model


def _cli() -> None:
    """命令行入口，支持图像/视频生成与上传。

    用法：
      python toapis.py image --model gpt-image-2 --prompt "..." --size 16:9 --save out.png
      python toapis.py video --model veo3.1-fast --prompt "..." --aspect-ratio 16:9 --save out.mp4
      python toapis.py upload --file ./ref.jpg
      python toapis.py status --type image --task-id task_xxx
      python toapis.py models
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="ToAPIs 能力封装：图像/视频生成、文件上传"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # 图像生成
    p_img = sub.add_parser("image", help="生成图像")
    p_img.add_argument("--model", default="", help="图像模型名（缺省取 TOAPIS_IMAGE_MODEL 或 gpt-image-2）")
    p_img.add_argument("--prompt", default="", help="生成提示词")
    p_img.add_argument("--prompt-file", default="", help="从文件读取提示词（与 --prompt 二选一）")
    p_img.add_argument("--size", default="1:1", help="比例，如 16:9、1:1")
    p_img.add_argument("--resolution", default="1k", help="分辨率：1k/2k/4k")
    p_img.add_argument("--n", type=int, default=1, help="生成数量")
    p_img.add_argument("--background", default="", help="背景，transparent 为透明")
    p_img.add_argument("--ref", action="append", help="参考图 URL（可多次）")
    p_img.add_argument("--bid", default="", help="业务 ID client_business_id")
    p_img.add_argument("--save", default="", help="保存路径")
    p_img.add_argument("--max-wait", type=int, default=120, help="最大等待秒数")

    # 视频生成
    p_vid = sub.add_parser("video", help="生成视频")
    p_vid.add_argument("--model", default="", help="视频模型名（缺省取 TOAPIS_VIDEO_MODEL 或 veo3.1-fast）")
    p_vid.add_argument("--prompt", default="", help="生成提示词")
    p_vid.add_argument("--prompt-file", default="", help="从文件读取提示词（与 --prompt 二选一）")
    p_vid.add_argument("--duration", type=int, default=0, help="视频时长秒数")
    p_vid.add_argument("--aspect-ratio", default="", help="比例，如 16:9、9:16")
    p_vid.add_argument("--ref", action="append", help="参考图 URL（可多次）")
    p_vid.add_argument("--bid", default="", help="业务 ID client_business_id")
    p_vid.add_argument("--save", default="", help="保存路径")
    p_vid.add_argument("--max-wait", type=int, default=600, help="最大等待秒数")

    # 上传
    p_up = sub.add_parser("upload", help="上传文件获取 URL")
    p_up.add_argument("--file", required=True, help="文件路径")
    p_up.add_argument(
        "--type", default="image", choices=["image", "video", "audio"], help="文件类型"
    )
    p_up.add_argument("--purpose", default="generation", help="上传目的")

    # 查询任务状态
    p_st = sub.add_parser("status", help="查询任务状态")
    p_st.add_argument("--type", required=True, choices=["image", "video"], help="任务类型")
    p_st.add_argument("--task-id", required=True, help="任务 ID 或业务 ID")

    # 列出模型
    sub.add_parser("models", help="列出常用模型")

    args = parser.parse_args()

    if args.command == "models":
        print("=== 图像模型 ===")
        for name, desc in IMAGE_MODELS.items():
            print(f"  {name:30s} {desc}")
        print("\n=== 视频模型 ===")
        for name, desc in VIDEO_MODELS.items():
            print(f"  {name:30s} {desc}")
        return

    if args.command == "image":
        model = _resolve_model(args.model, "image")
        params = ImageGenParams(
            model=model,
            prompt=_resolve_prompt(args),
            size=args.size,
            resolution=args.resolution,
            n=args.n,
            background=args.background,
            reference_images=args.ref or [],
            client_business_id=args.bid,
        )
        print(f"提交图像任务: model={model} size={args.size}")
        result = generate_image(params, max_wait=args.max_wait)
        if result.is_completed:
            print(f"✅ 生成完成: {result.url}")
            if args.save:
                download_file(result.url, args.save)
                print(f"✅ 已保存: {args.save}")
        else:
            print(f"❌ 生成失败: {result.error_code} {result.error_message}")
        return

    if args.command == "video":
        model = _resolve_model(args.model, "video")
        params = VideoGenParams(
            model=model,
            prompt=_resolve_prompt(args),
            duration=args.duration,
            aspect_ratio=args.aspect_ratio,
            image_urls=args.ref or [],
            client_business_id=args.bid,
        )
        print(f"提交视频任务: model={model} aspect={args.aspect_ratio}")
        result = generate_video(params, max_wait=args.max_wait)
        if result.is_completed:
            print(f"✅ 生成完成: {result.url}")
            if args.save:
                download_file(result.url, args.save)
                print(f"✅ 已保存: {args.save}")
        else:
            print(f"❌ 生成失败: {result.error_code} {result.error_message}")
        return

    if args.command == "upload":
        if args.type == "image":
            result = upload_image(args.file, purpose=args.purpose)
        elif args.type == "video":
            result = upload_video(args.file, purpose=args.purpose)
        else:
            result = upload_audio(args.file, purpose=args.purpose)
        print(f"✅ 上传成功: {result.url}")
        print(f"   ID: {result.file_id}  MIME: {result.mime_type}  Size: {result.size}")
        return

    if args.command == "status":
        if args.type == "image":
            result = get_image_task_status(args.task_id)
        else:
            result = get_video_task_status(args.task_id)
        print(f"任务 {result.task_id}")
        print(f"  状态: {result.status}  进度: {result.progress}%")
        if result.url:
            print(f"  URL: {result.url}")
        if result.error_message:
            print(f"  错误: {result.error_code} {result.error_message}")
        return


if __name__ == "__main__":
    _cli()
