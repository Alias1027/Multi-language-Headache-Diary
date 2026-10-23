package org.headachediary.offline;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.View;
import android.widget.FrameLayout;
import android.webkit.*;
import org.json.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

/** One bundled, origin-restricted WebView. No remotely supplied HTML has bridge access. */
public final class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net", ALIAS="headache-diary-device-v1";
 private static final int MAX=56*1024*1024, AUDIO=10*1024*1024;
 private WebView web; private SQLiteDatabase db; private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private String pendingId, exportText, serverOrigin="", cookie="";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  db=openOrCreateDatabase("diary-encrypted.db",MODE_PRIVATE,null);
  db.execSQL("CREATE TABLE IF NOT EXISTS vault(slot TEXT,n INTEGER,b BLOB,PRIMARY KEY(slot,n))");
  FrameLayout frame=new FrameLayout(this);
  web=new WebView(this);frame.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(frame);
  frame.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  frame.requestApplyInsets();
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(false);
  web.setWebChromeClient(new WebChromeClient());
  WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0);CookieManager.getInstance().setAcceptCookie(false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
    Uri u=r.getUrl();String p=u.getPath();
    if(!ORIGIN.equals(u.getScheme()+"://"+u.getAuthority())||p==null||p.contains("..")||!r.getMethod().equals("GET"))return blocked();
    try{String mime=p.endsWith(".mjs")||p.endsWith(".js")?"text/javascript":p.endsWith(".css")?"text/css":p.endsWith(".html")?"text/html":p.endsWith(".svg")?"image/svg+xml":"application/octet-stream";return new WebResourceResponse(mime,"UTF-8",getAssets().open(p.substring(1)));}catch(Exception ex){return blocked();}
   }
   @Override public void onReceivedSslError(WebView v,SslErrorHandler h,android.net.http.SslError error){h.cancel();}
  });
  web.addJavascriptInterface(new Bridge(),"AndroidBridge");web.loadUrl(ORIGIN+"/android/web/index.html");
 }
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 private SecretKey deviceKey() throws Exception {
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(!ks.containsAlias(ALIAS)){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());gen.generateKey();}
  return (SecretKey)ks.getKey(ALIAS,null);
 }
 private byte[] encrypted(JSONObject value) throws Exception {byte[] plain=value.toString().getBytes(StandardCharsets.UTF_8);if(plain.length>40*1024*1024)throw new Exception("backupSize");Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,deviceKey());c.updateAAD(ALIAS.getBytes(StandardCharsets.UTF_8));byte[] crypt=c.doFinal(plain);ByteArrayOutputStream out=new ByteArrayOutputStream();out.write(c.getIV());out.write(crypt);return out.toByteArray();}
 private byte[] readSlot(String slot) throws Exception {ByteArrayOutputStream out=new ByteArrayOutputStream();try(Cursor c=db.rawQuery("SELECT b FROM vault WHERE slot=? ORDER BY n",new String[]{slot})){while(c.moveToNext()){out.write(c.getBlob(0));if(out.size()>MAX)throw new Exception("backupSize");}}return out.toByteArray();}
 private JSONObject read() throws Exception {byte[] bytes=readSlot("active");if(bytes.length==0)return new JSONObject();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,deviceKey(),new GCMParameterSpec(128,Arrays.copyOfRange(bytes,0,12)));c.updateAAD(ALIAS.getBytes(StandardCharsets.UTF_8));return new JSONObject(new String(c.doFinal(Arrays.copyOfRange(bytes,12,bytes.length)),StandardCharsets.UTF_8));}
 private void writeSlot(String slot,byte[] bytes){db.delete("vault","slot=?",new String[]{slot});for(int i=0,n=0;i<bytes.length;i+=262144,n++){db.execSQL("INSERT INTO vault VALUES(?,?,?)",new Object[]{slot,n,Arrays.copyOfRange(bytes,i,Math.min(bytes.length,i+262144))});}}
 private void write(JSONObject value,boolean restore) throws Exception {byte[] bytes=encrypted(value);db.beginTransaction();try{if(restore){byte[] old=readSlot("active");writeSlot("previous",old);}writeSlot("active",bytes);db.setTransactionSuccessful();}finally{db.endTransaction();}}
 private void answer(String id,Object value,String error){runOnUiThread(()->{try{JSONObject r=new JSONObject().put("ok",error==null);if(error==null)r.put("value",value==null?JSONObject.NULL:value);else r.put("error",error);web.evaluateJavascript("window.nativeResult("+JSONObject.quote(id)+","+r+")",null);}catch(Exception ignored){}});}
 private String safeError(Exception e){String m=e.getMessage();return m!=null&&m.matches("[a-zA-Z_]{1,60}")?m:"nativeError";}
 final class Bridge {
  @JavascriptInterface public void call(String id,String method,String input){
   if(!id.matches("[0-9]{1,12}")||input.length()>MAX)return;
   worker.execute(()->{try{JSONObject a=new JSONObject(input);Object result=null;
    switch(method){
     case "get":result=read().opt(a.getString("key"));break;
     case "all":result=read();break;
     case "put":{JSONObject all=read();all.put(a.getString("key"),a.get("value"));write(all,false);break;}
     case "remove":{JSONObject all=read();all.remove(a.getString("key"));write(all,false);break;}
     case "replace":write(a.getJSONObject("value"),false);break;
     case "restore":write(a.getJSONObject("value"),true);cookie="";serverOrigin="";break;
     case "rollback":{byte[] previous=readSlot("previous"),active=readSlot("active");if(previous.length==0)throw new Exception("noRecoveryPoint");db.beginTransaction();try{writeSlot("active",previous);writeSlot("previous",active);db.setTransactionSuccessful();}finally{db.endTransaction();}cookie="";serverOrigin="";break;}
     case "connect":{URL u=new URL(a.getString("origin"));if(!u.getProtocol().equals("https")||u.getUserInfo()!=null||u.getQuery()!=null||u.getRef()!=null||!(u.getPath().isEmpty()||u.getPath().equals("/")))throw new Exception("httpsOnly");serverOrigin=a.getString("origin");cookie="";break;}
     case "disconnect":cookie="";serverOrigin="";break;
     case "http":result=request(a);break;
     case "record":case "audio":case "export":case "import":runOnUiThread(()->picker(id,method,a));return;
     default:throw new Exception("unsupportedAction");
    }answer(id,result,null);
   }catch(Exception e){answer(id,null,safeError(e));}});
  }
 }
 private Object request(JSONObject a) throws Exception {
  String path=a.getString("path");boolean post=a.has("body")&&!a.isNull("body");
  Set<String> gets=new HashSet<>(Arrays.asList("/api/state","/api/care","/api/care/access")),posts=new HashSet<>(Arrays.asList("/api/login","/api/register","/api/settings","/api/diary/batch","/api/care/lookup","/api/care/access","/api/care/save"));
  if(serverOrigin.isEmpty()||!(post?posts:gets).contains(path))throw new Exception("linkFirst");
  HttpsURLConnection conn=(HttpsURLConnection)new URL(serverOrigin+path).openConnection();conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(15000);conn.setReadTimeout(20000);conn.setRequestMethod(post?"POST":"GET");conn.setRequestProperty("Accept","application/json");conn.setRequestProperty("Origin",serverOrigin);if(!cookie.isEmpty())conn.setRequestProperty("Cookie",cookie);if(post)conn.setRequestProperty("X-CSRF-Token",a.optString("csrf"));
  try{if(post){byte[] body=a.get("body").toString().getBytes(StandardCharsets.UTF_8);if(body.length>262144)throw new Exception("requestSize");conn.setRequestProperty("Content-Type","application/json");conn.setDoOutput(true);try(OutputStream out=conn.getOutputStream()){out.write(body);}}
   int status=conn.getResponseCode();if(status>=300&&status<400)throw new Exception("redirectBlocked");String received=conn.getHeaderField("Set-Cookie");if(received!=null&&received.startsWith("hd_session="))cookie=received.split(";",2)[0];
   InputStream stream=status>=400?conn.getErrorStream():conn.getInputStream();String text=new String(readBounded(stream,16*1024*1024),StandardCharsets.UTF_8);Object body=new JSONTokener(text).nextValue();return new JSONObject().put("status",status).put("body",body);
  }finally{conn.disconnect();}
 }
 private byte[] readBounded(InputStream stream,int limit) throws Exception {if(stream==null)throw new Exception("networkError");try(InputStream in=stream;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[16384];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>limit)throw new Exception("fileTooLarge");}return out.toByteArray();}}
 private void picker(String id,String method,JSONObject a){
  if(pendingId!=null){answer(id,null,"pickerBusy");return;}pendingId=id;
  try{
   if(method.equals("record")){Intent rec=new Intent("android.provider.MediaStore.RECORD_SOUND");rec.putExtra("android.provider.MediaStore.extra.MAX_BYTES",(long)AUDIO);if(rec.resolveActivity(getPackageManager())!=null){startActivityForResult(rec,1);return;}method="audio";}
   Intent intent=new Intent(method.equals("export")?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
   if(method.equals("export")){exportText=a.getString("text");if(exportText.length()>MAX)throw new Exception("backupSize");intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"headache-diary-encrypted-backup.json");startActivityForResult(intent,3);}
   else {intent.setType(method.equals("audio")?"audio/*":"*/*");startActivityForResult(intent,method.equals("audio")?2:4);}
  }catch(Exception e){pendingId=null;exportText=null;answer(id,null,safeError(e));}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);String id=pendingId;pendingId=null;if(id==null)return;
  Uri uri=data==null?null:data.getData();if(result!=RESULT_OK||uri==null){exportText=null;answer(id,null,"cancelled");return;}
  if(!"content".equals(uri.getScheme())){answer(id,null,"invalidFile");return;}
  final String toExport=exportText;exportText=null;
  worker.execute(()->{try{Object output=null;
   if(request==3){try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new Exception("exportFailed");out.write(toExport.getBytes(StandardCharsets.UTF_8));out.flush();}}
   else if(request==4){output=new String(readBounded(getContentResolver().openInputStream(uri),MAX),StandardCharsets.UTF_8);}
   else {String mime=getContentResolver().getType(uri);if(mime==null||!mime.startsWith("audio/"))throw new Exception("invalidAudio");byte[] audio=readBounded(getContentResolver().openInputStream(uri),AUDIO);if(audio.length==0)throw new Exception("invalidAudio");JSONObject all=read();long total=audio.length;Iterator<String> keys=all.keys();while(keys.hasNext()){String k=keys.next();if(k.startsWith("audio-"))total+=all.getJSONObject(k).optLong("bytes");}if(total>24*1024*1024)throw new Exception("audioStorageFull");String key="audio-"+UUID.randomUUID();all.put(key,new JSONObject().put("mime",mime).put("bytes",audio.length).put("at",java.time.Instant.now().toString()).put("data",Base64.encodeToString(audio,Base64.NO_WRAP)));write(all,false);output=key;}
   answer(id,output,null);
  }catch(Exception e){answer(id,null,safeError(e));}});
 }
 @Override public void onBackPressed(){web.evaluateJavascript("document.querySelector('[data-mobile=page][data-page=diary]')?.click()",null);}
 @Override protected void onDestroy(){web.removeJavascriptInterface("AndroidBridge");web.destroy();worker.shutdown();super.onDestroy();}
}
