FROM node:18-slim

# 创建非 root 用户，提升安全性
RUN groupadd -r app && useradd -r -g app -d /home/app -s /bin/bash app

WORKDIR /usr/src/app

# 复制并安装依赖（尽量以 production 安装）
COPY package.json .
RUN npm install --production

# 拷贝应用代码
COPY . .

# 设定权限
RUN chown -R app:app /usr/src/app

USER app

EXPOSE 3000

# 环境变量：数据库路径与 auth 配置路径（可在容器启动时覆盖）
# ENV DB_PATH=/db/database.db db路径不由环境变量指定，由应用界面输入
ENV AUTH_PATH=/config/auth.json

CMD ["node","app.js"]