# Synthetic FIT files for cases the public test files do not cover:
# big-endian definitions, compressed timestamps with 32 s rollover, fields 32/73/78
# with a developer field, invalid sensor values, and a timer pause with smart recording.
# Usage: python tools/synth.py  (writes data/synth/*.fit)
import struct, sys, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'synth')
os.makedirs(OUT, exist_ok=True)
CRC_T=[0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400]
def crc(data,c=0):
    for b in data:
        t=CRC_T[c&0xF]; c=(c>>4)&0x0FFF; c=c^t^CRC_T[b&0xF]
        t=CRC_T[c&0xF]; c=(c>>4)&0x0FFF; c=c^t^CRC_T[(b>>4)&0xF]
    return c
def fitfile(body):
    h=struct.pack('<BBHI4s',14,0x20,2132,len(body),b'.FIT'); h+=struct.pack('<H',crc(h))
    d=h+body; return d+struct.pack('<H',crc(d))
def defmsg(local,gn,fields,be=False,dev=None):
    e='>' if be else '<'
    m=bytes([0x40|(0x20 if dev else 0)|local,0,1 if be else 0])+struct.pack(e+'HB',gn,len(fields))
    for n,s,bt in fields: m+=bytes([n,s,bt])
    if dev:
        m+=bytes([len(dev)])
        for n,s,i in dev: m+=bytes([n,s,i])
    return m
def file_id(be=False):
    e='>' if be else '<'
    return defmsg(0,0,[(0,1,0x00),(1,2,0x84),(2,2,0x84),(4,4,0x86)],be)+bytes([0])+struct.pack(e+'BHHI',4,255,0,1000000000)
T0=1000000000
REC=[(253,4,0x86),(3,1,0x02),(4,1,0x02),(5,4,0x86),(6,2,0x84),(7,2,0x84),(2,2,0x84)]
def rec(t,hr,cad,dist,spd,pw,alt,be=False):
    e='>' if be else '<'
    return struct.pack(e+'IBBIHHH',t,hr,cad,int(dist*100),int(spd*1000),pw,int((alt+500)*5))
out={}

b=file_id(True)+defmsg(1,20,REC,True)
for i in range(120): b+=bytes([1])+rec(T0+i,120+i%20,85+i%7,i*7.5,7.5+(i%5)*0.1,200+i%30,100+i*0.4,True)
out['synth_bigendian.fit']=b

b=file_id()+defmsg(1,20,REC)+bytes([1])+rec(T0+29,130,90,0,8,210,50)
RC=[(3,1,0x02),(4,1,0x02),(5,4,0x86),(6,2,0x84),(7,2,0x84),(2,2,0x84)]
b+=defmsg(2,20,RC)
for i in range(1,100):
    t=T0+29+i
    b+=bytes([0x80|(2<<5)|(t&0x1F)])+struct.pack('<BBIHHH',130+i%9,90,int(i*8*100),8000,210+i%11,int((50+i*0.3+500)*5))
out['synth_compressed.fit']=b

RX=[(253,4,0x86),(3,1,0x02),(4,1,0x02),(5,4,0x86),(6,2,0x84),(32,2,0x83),(73,4,0x86),(78,4,0x86),(7,2,0x84)]
b=file_id()+defmsg(1,20,RX,dev=[(0,2,0)])
for i in range(150):
    vs=-500 if i%2 else 400
    b+=bytes([1])+struct.pack('<IBBIHhIIH',T0+i,140,88,i*900,9000,vs,9100+i,int((200+i*0.2+500)*5),250+i%15)+struct.pack('<H',777)
out['synth_fields.fit']=b

b=file_id()+defmsg(1,20,REC)
for i in range(80):
    hr=0xFF if i%10==0 else 150; cad=0xFF if i%7==0 else 80; pw=0xFFFF if i%13==0 else 230
    b+=bytes([1])+struct.pack('<IBBIHHH',T0+i,hr,cad,i*800,8000,pw,0xFFFF if i%17==0 else int((300+500)*5))
out['synth_invalid.fit']=b
for k,v in out.items(): open(os.path.join(OUT,k),'wb').write(fitfile(v))
print(list(out))

EV=[(253,4,0x86),(0,1,0x00),(1,1,0x00)]
RP=[(253,4,0x86),(7,2,0x84),(3,1,0x02)]
b=file_id()+defmsg(2,21,EV)+defmsg(1,20,RP)
b+=bytes([2])+struct.pack('<IBB',T0,0,0)
def pw(i): return 0 if 600<=i%1200<690 else (420 if i%120<25 else 190+i%9)
prev=None
for i in list(range(0,1800))+list(range(2400,3600)):
    p=pw(i)
    if i==2400: b+=bytes([2])+struct.pack('<IBB',T0+2400,0,0)
    if p==0 and prev==0: prev=p; continue
    b+=bytes([1])+struct.pack('<IHB',T0+i,p,140); prev=p
    if i==1799: b+=bytes([2])+struct.pack('<IBB',T0+1799,0,4)
b+=bytes([2])+struct.pack('<IBB',T0+3599,0,4)
open(os.path.join(OUT,'synth_pause.fit'),'wb').write(fitfile(b))
print('synth_pause.fit')
