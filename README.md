# Task Assignment / 任务分配

一个基于原生 Frappe Desk 的轻量老师—学生任务系统。界面支持中文和英文，不包含独立前端框架。

A lightweight teacher-to-student assignment system built directly on Frappe Desk, with Chinese and English interfaces.

## 功能

- 老师创建、保存草稿、发布并指定学生。
- 任务可归入项目，支持项目和学生目录。
- 学生只看到自己的已发布任务，可以提交说明和文件。
- 状态流转：待办 → 已提交 → 已完成 → 已归档。
- 老师和学生都有未读任务提醒、列表搜索和标签。
- 登录页、管理中台、表单及列表均可切换中文 / English。

## 安装

在已有 Frappe Bench 中执行：

```bash
bench get-app https://github.com/gongye19/frappe-task-assignment
bench --site your-site install-app task_assignment
bench --site your-site migrate
bench build --app task_assignment
```

安装器会创建 `teacher@example.com` 和 `student@example.com` 两个演示账号。密码必须通过环境变量提供，仓库不会保存任何密码：

```bash
export TASK_ASSIGNMENT_TEACHER_PASSWORD='choose-a-password'
export TASK_ASSIGNMENT_STUDENT_PASSWORD='choose-another-password'
```

也可以在安装前写入站点配置：

```bash
bench --site your-site set-config task_assignment_teacher_password 'choose-a-password'
bench --site your-site set-config task_assignment_student_password 'choose-another-password'
```

## 数据模型

- `School Task`：任务、指定学生、提交和老师验收。
- `School Project`：任务所属项目。
- `School Student`：学生账号和班级目录。

任务、项目和学生状态在数据库中使用稳定的英文值，通过 Frappe 翻译表显示为中文。这使筛选、API 和后续集成不依赖当前界面语言。

## License

MIT
