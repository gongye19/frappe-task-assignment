# Task Manager / 任务管理

一个基于原生 Frappe Desk 的轻量老师任务管理系统。界面支持中文和英文，不包含独立前端框架。

A lightweight task manager for teachers, built directly on Frappe Desk with Chinese and English interfaces.

## 功能

- 老师添加、编辑和删除任务。
- 任务可归入项目，支持项目目录。
- 状态包括：待办、已完成、已归档。
- 支持列表搜索、排序、附件和标签。
- 登录页、管理中台、表单及列表均可切换中文 / English。

## 安装

在已有 Frappe Bench 中执行：

```bash
bench get-app https://github.com/gongye19/frappe-task-assignment
bench --site your-site install-app task_assignment
bench --site your-site migrate
bench build --app task_assignment
```

安装器会创建 `teacher@example.com` 演示账号。密码必须通过环境变量提供，仓库不会保存任何密码：

```bash
export TASK_ASSIGNMENT_TEACHER_PASSWORD='choose-a-password'
```

也可以在安装前写入站点配置：

```bash
bench --site your-site set-config task_assignment_teacher_password 'choose-a-password'
```

## 数据模型

- `School Task`：老师管理的任务。
- `School Project`：任务所属项目。

任务和项目状态在数据库中使用稳定的英文值，通过 Frappe 翻译表显示为中文。这使筛选和 API 不依赖当前界面语言。

## Railway 演示部署

仓库内的 `Dockerfile` 和 `railway.toml` 用于单容器演示部署。需要：

- MariaDB 10.11 服务和挂载到 `/var/lib/mysql` 的持久化卷；
- Redis 服务；
- 应用服务挂载到 `/home/frappe/frappe-bench/sites` 的持久化卷；
- 数据库、Redis、`ADMIN_PASSWORD` 以及老师演示账号密码环境变量。

Railway 默认的 MySQL 服务不适用于这个 Frappe v16 镜像，请使用 MariaDB 10.6 或更高版本。生产环境建议采用 Frappe 官方的多进程部署结构；仓库中的单容器方案主要用于产品演示。

## License

MIT
