export function StandardRecoveryHandler() {
  const source = `(()=>{
    const p=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):location.hash);
    const authError=p.has('sb')&&(p.has('error')||p.has('error_code'));
    const recovery=p.get('type')==='recovery';
    if(!authError&&!recovery)return;
    history.replaceState(null,'',location.pathname+location.search);
    const invalid=()=>location.replace('/reset-password?error=invalid');
    if(authError)return invalid();
    const accessToken=p.get('access_token');
    const refreshToken=p.get('refresh_token');
    if(!accessToken||!refreshToken)return invalid();
    fetch('/auth/recovery/authorize',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accessToken,refreshToken})
    }).then(r=>r.ok?location.replace('/reset-password'):invalid()).catch(invalid);
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}
