echo '开始部署'
rm -rf ./build
npm run build
cd build
git init
git add -A
git commit -m 'deploy'
git branch main
git checkout main
git push -f git@github.com:xxh2000/xxh2000.github.io.git main
echo '部署成功'