## 开发说明

## 运行和打包部署

### docker部署

构建镜像：
`docker build -t super-gengar:latest .`

运行容器：
`docker run -itd --restart always -e TZ=Asia/Shanghai -p 80:80 --name super-gengar super-gengar:latest`

### 运行

```bash
npm run dev
```
