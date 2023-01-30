import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { PrismaService } from '../src/prisma/prisma.service'
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from '../src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
    let app: INestApplication
    let prisma: PrismaService

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile()
        app = moduleRef.createNestApplication()

        app.useGlobalPipes(new ValidationPipe({
            whitelist: true
        }))
        await app.init()
        await app.listen(1234)

        prisma = app.get(PrismaService)
        await prisma.cleanDb()
        pactum.request.setBaseUrl('http://localhost:1234')
    })

    afterAll(() => {
        app.close();
    });

    describe('Auth', () => {
        const dto: AuthDto = {
            email: 'test@test.com',
            password: '1234'
        }
        describe('Singup', () => {
            it('Should throw if email empty', () => {
                return pactum.spec().post('/auth/signup').withBody({
                    password: dto.password
                }).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should throw if password empty', () => {
                return pactum.spec().post('/auth/signup').withBody({
                    email: dto.email
                }).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should throw if body empty', () => {
                return pactum.spec().post('/auth/signup').withBody({}).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should signup', () => {
                return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(HttpStatus.CREATED)
            })
        })
        describe('Signin', () => {
            it('Should throw if email empty', () => {
                return pactum.spec().post('/auth/signin').withBody({
                    password: dto.password
                }).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should throw if password empty', () => {
                return pactum.spec().post('/auth/signin').withBody({
                    email: dto.email
                }).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should throw if body empty', () => {
                return pactum.spec().post('/auth/signin').withBody({}).expectStatus(HttpStatus.BAD_REQUEST)
            })
            it('Should signin', () => {
                return pactum.spec().post('/auth/signin').withBody(dto).expectStatus(HttpStatus.OK).stores('userAt', 'access_token')
            })
        })
    })

    describe('User', () => {
        describe('Get me', () => {
            it('Should get current user', () => {
                return pactum.spec().get('/users/me').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.OK)
            })
        })
        describe('Edit user', () => {
            it('Should update user data', () => {
                const dto: EditUserDto = {
                    firstName: 'John',
                    lastName: 'Doe'
                }
                return pactum.spec().patch('/users').withHeaders({ Authorization: 'Bearer $S{userAt}' }).withBody(dto).expectStatus(HttpStatus.OK).expectBodyContains(dto.firstName).expectBodyContains(dto.lastName)
            })
        })

    })

    describe('Bookmarks', () => {
        describe('Get empty bookmarks', () => {
            it('Should get bookmarks, but empty', () => {
                return pactum.spec().get('/bookmarks').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.OK).expectBody([])
            })
        })
        describe('Create bookmark', () => {
            it('Should create bookmark', () => {
                const dto: CreateBookmarkDto = {
                    title: 'Awesome website',
                    description: 'Lorem ipsum dolor sit amet.',
                    link: 'https://localhost'
                }
                return pactum.spec().post('/bookmarks').withHeaders({ Authorization: 'Bearer $S{userAt}' }).withBody(dto).expectStatus(HttpStatus.CREATED).stores('bookmarkId', 'id')
            })
        })
        describe('Get bookmarks', () => {
            it('Should get bookmarks', () => {
                return pactum.spec().get('/bookmarks').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.OK).expectJsonLength(1)
            })
        })
        describe('Get bookmark by id', () => {
            it('Should get bookmark by id', () => {
                return pactum.spec().get('/bookmarks/{id}').withPathParams('id', '$S{bookmarkId}').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.OK).expectBodyContains('$S{bookmarkId}')
            })
        })
        describe('Edit bookmark', () => {
            it('Should edit bookmark by id', () => {
                const dto: EditBookmarkDto = {
                    title: 'Boring website!',
                    description: null
                }
                return pactum.spec().patch('/bookmarks/{id}').withPathParams('id', '$S{bookmarkId}').withHeaders({ Authorization: 'Bearer $S{userAt}' }).withBody(dto).expectStatus(HttpStatus.OK).expectBodyContains('$S{bookmarkId}').expectBodyContains(dto.title)
            })
        })
        describe('Delete bookmark', () => {
            it('Should delete bookmark by id', () => {
                return pactum.spec().delete('/bookmarks/{id}').withPathParams('id', '$S{bookmarkId}').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.NO_CONTENT)
            })
            it('Should get empty bookmarks', () => {
                return pactum.spec().get('/bookmarks').withHeaders({ Authorization: 'Bearer $S{userAt}' }).expectStatus(HttpStatus.OK).expectBody([])
            })
        })

    })
})